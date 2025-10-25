import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";
import { z } from "zod";
import { checkPermission } from "@/lib/permissions";

const querySchema = z
  .object({
    type: z.string().optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
  })
  .strict();

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

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.userId || !session.user.email) {
      return NextResponse.json(
        { error: "Unauthorized: No active session found" },
        { status: 401 }
      );
    }

    const url = new URL(req.url);
    const queryParams = Object.fromEntries(url.searchParams);
    const parsed = querySchema.safeParse(queryParams);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: parsed.error.errors },
        { status: 400 }
      );
    }

    const { type, startDate, endDate } = parsed.data;
    let pushMessages;

    // Check if user has a privileged profile (hr_coordinator, store_director, hr_coordinator_manager, md)
    const privilegedProfiles = ["hr_coordinator", "store_director", "hr_coordinator_manager", "md"];
    const isPrivileged = session.user.profile && privilegedProfiles.includes(session.user.profile);

    if (isPrivileged) {
      const permission = await checkPermission(session, "SEND_PUSH_MESSAGES", {
        storeBoundCheck: session.user.profile === "hr_coordinator" || session.user.profile === "store_director",
      });
      if (!permission.isAuthorized) {
        return NextResponse.json(
          { error: permission.error },
          { status: permission.status }
        );
      }

      if (session.user.profile === "hr_coordinator" || session.user.profile === "store_director") {
        // Store-bound: Fetch messages for their store and own INDIVIDUAL messages
        const verification = await verifyHrAndStore(session.user.userId, session.user.profile);
        if ("error" in verification) {
          return NextResponse.json(
            { error: verification.error },
            { status: verification.status }
          );
        }

        const storeUsers = await db.user.findMany({
          where: { store: verification.storeName },
          select: { id: true },
        });

        const userIds = storeUsers.map((u) => u.id);

        pushMessages = await db.pushMessage.findMany({
          where: {
            OR: [
              { userId: session.user.userId, recipientType: "INDIVIDUAL" }, // Own messages
              { storeId: verification.storeId, recipientType: "STORE", userId: null }, // Store messages
              { userId: { in: userIds }, recipientType: "INDIVIDUAL" }, // INDIVIDUAL messages to store users
            ],
            ...(type ? { type } : {}),
            ...(startDate || endDate
              ? {
                  createdAt: {
                    ...(startDate ? { gte: new Date(startDate) } : {}),
                    ...(endDate ? { lte: new Date(endDate) } : {}),
                  },
                }
              : {}),
          },
          select: {
            id: true,
            type: true,
            message: true,
            createdAt: true,
            expiryTime: true,
            read: true,
            recipientType: true,
            Store: { select: { name: true } },
            CreatedBy: { select: { username: true } },
            User: { select: { username: true } }, // For recipient username in INDIVIDUAL messages
          },
          orderBy: { createdAt: "desc" },
        });
      } else {
        // Non-store-bound (hr_coordinator_manager, md): Fetch all messages
        pushMessages = await db.pushMessage.findMany({
          where: {
            ...(type ? { type } : {}),
            ...(startDate || endDate
              ? {
                  createdAt: {
                    ...(startDate ? { gte: new Date(startDate) } : {}),
                    ...(endDate ? { lte: new Date(endDate) } : {}),
                  },
                }
              : {}),
          },
          select: {
            id: true,
            type: true,
            message: true,
            createdAt: true,
            expiryTime: true,
            read: true,
            recipientType: true,
            Store: { select: { name: true } },
            CreatedBy: { select: { username: true } },
            User: { select: { username: true } }, // For recipient username in INDIVIDUAL messages
          },
          orderBy: { createdAt: "desc" },
        });
      }
    } else {
      // Employee: Fetch messages for their store and own INDIVIDUAL messages
      if (!session.user.store) {
        return NextResponse.json(
          { error: "User not assigned to a store" },
          { status: 404 }
        );
      }

      const store = await db.store.findUnique({
        where: { name: session.user.store },
        select: { id: true },
      });

      if (!store) {
        return NextResponse.json(
          { error: `Store '${session.user.store}' not found` },
          { status: 404 }
        );
      }

      pushMessages = await db.pushMessage.findMany({
        where: {
          OR: [
            { userId: session.user.userId, recipientType: "INDIVIDUAL" },
            { storeId: store.id, recipientType: "STORE", userId: null },
          ],
          ...(type ? { type } : {}),
          ...(startDate || endDate
            ? {
                createdAt: {
                  ...(startDate ? { gte: new Date(startDate) } : {}),
                  ...(endDate ? { lte: new Date(endDate) } : {}),
                },
              }
            : {}),
        },
        select: {
          id: true,
          type: true,
          message: true,
          createdAt: true,
          expiryTime: true,
          read: true,
          recipientType: true,
          Store: { select: { name: true } },
          CreatedBy: { select: { username: true } },
          User: { select: { username: true } }, // For recipient username in INDIVIDUAL messages
        },
        orderBy: { createdAt: "desc" },
      });
    }

    const formattedMessages = pushMessages.map((msg) => ({
      id: msg.id,
      type: msg.type,
      message: msg.message,
      createdAt: msg.createdAt,
      expiryTime: msg.expiryTime,
      read: msg.read,
      recipientType: msg.recipientType,
      storeName: msg.Store?.name || null,
      createdBy: msg.CreatedBy.username,
      recipientUsername:
        msg.recipientType === "INDIVIDUAL" ? msg.User?.username || null : null,
    }));

    return NextResponse.json(formattedMessages, { status: 200 });
  } catch (error) {
    console.error("Error fetching push message history:", error);
    return NextResponse.json(
      { error: `Internal server error: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}