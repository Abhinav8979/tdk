import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";
import { z } from "zod";
import { checkPermission } from "@/lib/permissions";

// In-memory store for SSE connections
const sseClients: Map<string, { userId: string; storeName: string; res: any }> =
  new Map();

const pushMessageSchema = z
  .object({
    message: z.string().min(1, "Message is required"),
    type: z.string().min(1, "Message type is required"),
    expiryTime: z
      .string()
      .regex(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.*Z$/,
        "Expiry time must be a valid ISO date"
      ),
    recipientType: z.enum(["INDIVIDUAL", "STORE", "ALL"]),
    userId: z.string().optional(),
    storeName: z.string().optional(),
  })
  .strict()
  .refine(
    (data) =>
      (data.recipientType === "INDIVIDUAL" && data.userId && !data.storeName) ||
      (data.recipientType === "STORE" && data.storeName && !data.userId) ||
      (data.recipientType === "ALL" && !data.userId && !data.storeName),
    {
      message:
        "For INDIVIDUAL, userId is required; for STORE, storeName is required; for ALL, neither userId nor storeName should be provided",
      path: ["userId", "storeName"],
    }
  );

async function verifyHrAndStore(userId: string, profile: string | null | undefined) {
  const store = await db.store.findFirst({
    where: {
      OR: [
        { hrs: { some: { id: userId } } }, // For hr_coordinator
        { employees: { some: { id: userId } } }, // For store_director
      ],
    },
    select: { id: true, name: true },
  });

  if (!store) {
    return { error: "Forbidden: User is not assigned to any store", status: 403 };
  }

  return { storeId: store.id, storeName: store.name };
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.email || !session.user.userId) {
      return NextResponse.json(
        { error: "Unauthorized: No active session found" },
        { status: 401 }
      );
    }

    // Check permissions
    const permission = await checkPermission(session, "SEND_PUSH_MESSAGES", {
      storeBoundCheck: session.user.profile === "hr_coordinator" || session.user.profile === "store_director",
    });
    if (!permission.isAuthorized) {
      return NextResponse.json(
        { error: permission.error },
        { status: permission.status }
      );
    }

    const body = await req.json();
    const parsed = pushMessageSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.errors },
        { status: 400 }
      );
    }

    const { message, type, expiryTime, recipientType, userId, storeName } =
      parsed.data;

    let storeId: string | undefined;
    let storeNameForBroadcast: string | undefined;

    if (session.user.profile === "hr_coordinator" || session.user.profile === "store_director") {
      const verification = await verifyHrAndStore(session.user.userId, session.user.profile);
      if ("error" in verification) {
        return NextResponse.json(
          { error: verification.error },
          { status: verification.status }
        );
      }

      if (recipientType === "INDIVIDUAL") {
        const targetUser = await db.user.findUnique({
          where: { id: userId },
          select: { id: true, store: true },
        });

        if (!targetUser) {
          return NextResponse.json(
            { error: `User '${userId}' not found` },
            { status: 404 }
          );
        }

        if (targetUser.store !== verification.storeName) {
          return NextResponse.json(
            {
              error:
                "Forbidden: Can only send messages to users in your own store",
            },
            { status: 403 }
          );
        }
      } else if (recipientType === "STORE" && storeName !== verification.storeName) {
        return NextResponse.json(
          { error: "Forbidden: Can only send messages to your own store" },
          { status: 403 }
        );
      } else if (recipientType === "ALL") {
        return NextResponse.json(
          { error: "Forbidden: Only hr_coordinator_manager and md can send messages to ALL users" },
          { status: 403 }
        );
      }

      storeId = verification.storeId;
      storeNameForBroadcast = verification.storeName;
    } else if (session.user.profile === "hr_coordinator_manager" || session.user.profile === "md") {
      if (recipientType === "STORE") {
        const store = await db.store.findUnique({
          where: { name: storeName },
          select: { id: true },
        });

        if (!store) {
          return NextResponse.json(
            { error: `Store '${storeName}' not found` },
            { status: 404 }
          );
        }
        storeId = store.id;
        storeNameForBroadcast = storeName;
      } else if (recipientType === "INDIVIDUAL") {
        const targetUser = await db.user.findUnique({
          where: { id: userId },
          select: { id: true },
        });

        if (!targetUser) {
          return NextResponse.json(
            { error: `User '${userId}' not found` },
            { status: 404 }
          );
        }
        storeNameForBroadcast = storeName; // May be undefined for INDIVIDUAL
      }
    } else {
      return NextResponse.json(
        { error: "Forbidden: Insufficient permissions" },
        { status: 403 }
      );
    }

    const pushMessages = await db.$transaction(async (tx) => {
      if (recipientType === "INDIVIDUAL") {
        const pushMessage = await tx.pushMessage.create({
          data: {
            type,
            message,
            expiryTime: new Date(expiryTime),
            recipientType,
            userId,
            createdById: session.user.userId,
          },
        });

        // Broadcast to SSE clients
        for (const [_, client] of sseClients) {
          if (client.userId === userId) {
            client.res.enqueue(`data: ${JSON.stringify(pushMessage)}\n\n`);
          }
        }

        return [pushMessage];
      } else if (recipientType === "STORE") {
        const pushMessage = await tx.pushMessage.create({
          data: {
            type,
            message,
            expiryTime: new Date(expiryTime),
            recipientType,
            storeId,
            createdById: session.user.userId,
          },
        });

        // Broadcast to SSE clients
        for (const [_, client] of sseClients) {
          if (client.storeName === storeNameForBroadcast) {
            client.res.enqueue(`data: ${JSON.stringify(pushMessage)}\n\n`);
          }
        }

        return [pushMessage];
      } else {
        // For ALL
        const users = await tx.user.findMany({
          select: { id: true },
        });

        const pushMessages = await Promise.all(
          users.map((user) =>
            tx.pushMessage.create({
              data: {
                type,
                message,
                expiryTime: new Date(expiryTime),
                recipientType: "INDIVIDUAL",
                userId: user.id,
                createdById: session.user.userId,
              },
            })
          )
        );

        // Broadcast to all SSE clients
        for (const [_, client] of sseClients) {
          const userMessages = pushMessages.filter(
            (msg) => msg.userId === client.userId
          );
          userMessages.forEach((msg) => {
            client.res.enqueue(`data: ${JSON.stringify(msg)}\n\n`);
          });
        }

        return pushMessages;
      }
    });

    return NextResponse.json(pushMessages, { status: 201 });
  } catch (error) {
    console.error("Error creating push message:", error);
    return NextResponse.json(
      { error: `Internal server error: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !session.user.userId) {
    return NextResponse.json(
      { error: "Unauthorized: No active session found" },
      { status: 401 }
    );
  }

  const user = await db.user.findUnique({
    where: { id: session.user.userId },
    select: { id: true, store: true },
  });

  if (!user || !user.store) {
    return NextResponse.json(
      { error: "User not found or not assigned to a store" },
      { status: 404 }
    );
  }

  return new Response(
    new ReadableStream({
      start(controller) {
        const clientId = Math.random().toString(36).substring(2);
        sseClients.set(clientId, {
          userId: user.id,
          storeName: user.store || "",
          res: controller,
        });

        // Send initial heartbeat
        controller.enqueue(`data: {"type": "heartbeat"}\n\n`);

        // Clean up on connection close
        req.signal.addEventListener("abort", () => {
          sseClients.delete(clientId);
          controller.close();
        });
      },
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    }
  );
}