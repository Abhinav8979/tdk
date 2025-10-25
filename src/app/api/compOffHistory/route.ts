import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";
import { z } from "zod";

const compOffHistoryQuerySchema = z.object({
  employeeId: z.string().optional(),
  all: z.string().optional().transform((val) => val === "true"),
}).strict();

const selectFields = {
  historyId: true,
  employeeId: true,
  compOffDays: true,
  action: true,
  amount: true,
  createdAt: true,
  updatedAt: true,
  Employee: {
    select: {
      id: true,
      username: true,
      email: true,
      store: true,
      store_info: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  },
};

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.email) {
      return NextResponse.json(
        { error: "Unauthorized: No active session" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const parsed = compOffHistoryQuerySchema.safeParse({
      employeeId: searchParams.get("employeeId"),
      all: searchParams.get("all"),
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.errors },
        { status: 400 }
      );
    }

    const { employeeId, all } = parsed.data;

    const currentUser = await db.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, profile: true, store: true },
    });

    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Restrict access for certain profiles to their store
    const isRestrictedProfile = [
      "hr_coordinator",
      "store_director",
      "hr_coordinator_manager",
    ].includes(currentUser.profile || "");

    if (all) {
      let compOffHistory;
      if (isRestrictedProfile) {
        if (!currentUser.store) {
          return NextResponse.json(
            { error: "Forbidden: User is not assigned to any store" },
            { status: 403 }
          );
        }

        compOffHistory = await db.compOffHistory.findMany({
          where: {
            Employee: { store: currentUser.store },
          },
          select: selectFields,
          orderBy: { createdAt: "desc" },
        });
      } else {
        compOffHistory = await db.compOffHistory.findMany({
          select: selectFields,
          orderBy: { createdAt: "desc" },
        });
      }

      return NextResponse.json(compOffHistory, { status: 200 });
    }

    if (employeeId) {
      if (isRestrictedProfile) {
        const targetUser = await db.user.findUnique({
          where: { id: employeeId },
          select: { store: true },
        });

        if (!targetUser) {
          return NextResponse.json(
            { error: "Target employee not found" },
            { status: 404 }
          );
        }

        if (targetUser.store !== currentUser.store) {
          return NextResponse.json(
            { error: "Forbidden: Can only access comp off history for employees in your store" },
            { status: 403 }
          );
        }
      }

      const compOffHistory = await db.compOffHistory.findMany({
        where: { employeeId },
        select: selectFields,
        orderBy: { createdAt: "desc" },
      });

      if (!compOffHistory.length) {
        return NextResponse.json(
          { error: "No comp off history found for this employee" },
          { status: 404 }
        );
      }

      return NextResponse.json(compOffHistory, { status: 200 });
    }

    return NextResponse.json(
      { error: "Bad Request: Provide employeeId or all=true" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error fetching comp off history:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}