import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";
import { checkPermission } from "@/lib/permissions";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.userId as string;
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { profile: true, store: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const privilegedProfiles = ["hr_coordinator", "hr_coordinator_manager", "store_director", "md"];
    const isPrivileged = user.profile && privilegedProfiles.includes(user.profile);

    let leaves;
    if (isPrivileged) {
      // Check permission for viewing leaves of others
      const permission = await checkPermission(session, "VIEW_ATTENDANCE", {
        storeBoundCheck: user.profile === "hr_coordinator" || user.profile === "store_director",
      });
      if (!permission.isAuthorized) {
        return NextResponse.json(
          { error: permission.error },
          { status: permission.status }
        );
      }

      if (!user.store && (user.profile === "hr_coordinator" || user.profile === "store_director")) {
        return NextResponse.json(
          { error: "Forbidden: Not assigned to any store" },
          { status: 403 }
        );
      }

      leaves = await db.leave.findMany({
        where: {
          Employee: { store: user.store },
        },
        include: {
          Employee: { select: { username: true } },
          ApprovedBy: { select: { username: true } },
        },
      });
    } else {
      // Check permission for viewing own leaves
      const permission = await checkPermission(session, "VIEW_OWN_LEAVES", {
        targetUserId: userId,
      });
      if (!permission.isAuthorized) {
        return NextResponse.json(
          { error: permission.error },
          { status: permission.status }
        );
      }

      leaves = await db.leave.findMany({
        where: { employeeId: userId },
        include: {
          Employee: { select: { username: true } },
          ApprovedBy: { select: { username: true } },
        },
      });
    }

    return NextResponse.json({ leaves }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}