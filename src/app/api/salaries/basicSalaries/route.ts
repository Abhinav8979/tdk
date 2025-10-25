import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";
import { z } from "zod";
import { checkPermission } from "@/lib/permissions";

const basicSalarySchema = z.object({
  basicSalary: z
    .number()
    .nonnegative("Basic salary must be non-negative")
    .optional(),
}).strict();

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.email || !session.user.userId) {
      return NextResponse.json(
        { error: "Unauthorized: No active session" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "Bad Request: User ID is required" },
        { status: 400 }
      );
    }

    // Check permissions
    const permission = await checkPermission(session, "VIEW_USER_SALARY", {
      targetUserId: userId,
      storeBoundCheck: session.user.profile === "hr_coordinator" || session.user.profile === "store_director",
    });

    if (!permission.isAuthorized) {
      return NextResponse.json(
        { error: permission.error },
        { status: permission.status }
      );
    }

    // Verify store assignment for store-bound profiles
    if (session.user.profile === "hr_coordinator" || session.user.profile === "store_director") {
      const targetUser = await db.user.findUnique({
        where: { id: userId },
        select: { store: true },
      });

      if (!targetUser) {
        return NextResponse.json(
          { error: "Target user not found" },
          { status: 404 }
        );
      }

      const hrStore = await db.store.findFirst({
        where: {
          OR: [
            { hrs: { some: { id: session.user.userId } } }, // For hr_coordinator
            { employees: { some: { id: session.user.userId } } }, // For store_director
          ],
        },
        select: { name: true },
      });

      if (!hrStore) {
        return NextResponse.json(
          { error: "Forbidden: User is not assigned to any store" },
          { status: 403 }
        );
      }

      if (targetUser.store !== hrStore.name) {
        return NextResponse.json(
          { error: "Forbidden: Can only view salary of users in your own store" },
          { status: 403 }
        );
      }
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        basicSalary: true,
        store: true,
        store_info: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        id: user.id,
        username: user.username,
        basicSalary: user.basicSalary,
        store: user.store,
        store_info: user.store_info,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching user basic salary:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.email || !session.user.userId) {
      return NextResponse.json(
        { error: "Unauthorized: No active session" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "Bad Request: User ID is required" },
        { status: 400 }
      );
    }

    // Check permissions
    const permission = await checkPermission(session, "UPDATE_USER_SALARY", {
      targetUserId: userId,
      storeBoundCheck: session.user.profile === "hr_coordinator" || session.user.profile === "store_director",
    });

    if (!permission.isAuthorized) {
      return NextResponse.json(
        { error: permission.error },
        { status: permission.status }
      );
    }

    // Verify store assignment for store-bound profiles
    if (session.user.profile === "hr_coordinator" || session.user.profile === "store_director") {
      const targetUser = await db.user.findUnique({
        where: { id: userId },
        select: { store: true },
      });

      if (!targetUser) {
        return NextResponse.json(
          { error: "Target user not found" },
          { status: 404 }
        );
      }

      const hrStore = await db.store.findFirst({
        where: {
          OR: [
            { hrs: { some: { id: session.user.userId } } }, // For hr_coordinator
            { employees: { some: { id: session.user.userId } } }, // For store_director
          ],
        },
        select: { name: true },
      });

      if (!hrStore) {
        return NextResponse.json(
          { error: "Forbidden: User is not assigned to any store" },
          { status: 403 }
        );
      }

      if (targetUser.store !== hrStore.name) {
        return NextResponse.json(
          { error: "Forbidden: Can only update salary of users in your own store" },
          { status: 403 }
        );
      }
    }

    const body = await req.json();
    const parsed = basicSalarySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.errors },
        { status: 400 }
      );
    }

    const { basicSalary } = parsed.data;

    const updatedUser = await db.user.update({
      where: { id: userId },
      data: {
        basicSalary: basicSalary !== undefined ? basicSalary : null,
      },
      select: {
        id: true,
        username: true,
        basicSalary: true,
        store: true,
        store_info: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(updatedUser, { status: 200 });
  } catch (error) {
    console.error("Error updating user basic salary:", error);
    return NextResponse.json(
      { error: `Internal server error: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}