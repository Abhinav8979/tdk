import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { checkPermission } from "@/lib/permissions";

const deleteLeaveSchema = z
  .object({
    leaveId: z.string(),
  })
  .strict();

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.userId as string;
    const body = await request.json();
    const parsed = deleteLeaveSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.errors },
        { status: 400 }
      );
    }

    const { leaveId } = parsed.data;

    const leave = await db.leave.findUnique({
      where: { leaveId },
      include: {
        Employee: { select: { store: true, reportingManager: true } },
      },
    });

    if (!leave) {
      return NextResponse.json({ error: "Leave not found" }, { status: 404 });
    }

    // Authorization check
    const permission = await checkPermission(session, "WITHDRAW_LEAVE", {
      targetUserId: leave.employeeId,
    });
    if (!permission.isAuthorized) {
      return NextResponse.json(
        { error: permission.error },
        { status: permission.status }
      );
    }

    if (leave.status !== "pending") {
      return NextResponse.json(
        { error: "Only pending leaves can be withdrawn" },
        { status: 400 }
      );
    }

    await db.$transaction(async (tx) => {
      // Delete associated LeaveHistory records
      await tx.leaveHistory.deleteMany({ where: { leaveId } });

      // Reset Attendance records
      const startDate = new Date(leave.startDate);
      const endDate = new Date(leave.endDate);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(0, 0, 0, 0);

      await tx.attendance.updateMany({
        where: {
          employeeId: leave.employeeId,
          date: { gte: startDate, lte: endDate },
          status: "leave",
        },
        data: { status: "absent", updatedAt: new Date() },
      });

      // Delete the Leave
      await tx.leave.delete({ where: { leaveId } });

      // Notify HR and reporting manager
      // const notifications = [];
      if (leave.Employee.store && leave.approvalStage === "hr") {
        const hrUsers = await tx.user.findMany({
          where: { userType: "hr", store: leave.Employee.store },
        });
        // notifications.push(
        //   ...hrUsers.map((hr) => ({
        //     id: uuidv4(),
        //     type: "leave_withdrawal",
        //     message: `Leave ${leaveId} withdrawn by ${userId}`,
        //     createdAt: new Date(),
        //     read: false,
        //     userId: hr.id,
        //   }))
        // );
      }
      // if (leave.Employee.reportingManager) {
        // notifications.push({
        //   id: uuidv4(),
        //   type: "leave_withdrawal",
        //   message: `Leave ${leaveId} withdrawn by ${userId}`,
        //   createdAt: new Date(),
        //   read: false,
        //   userId: leave.Employee.reportingManager,
        // });
      // }

      // if (notifications.length) {
      //   await tx.notification.createMany({ data: notifications });
      // }
    });

    return NextResponse.json({ message: "Leave withdrawn" }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}