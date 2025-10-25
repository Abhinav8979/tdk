import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

const updateLeaveSchema = z
  .object({
    leaveId: z.string(),
    status: z.enum(["approved", "rejected"]),
    remark: z.string().optional(),
  })
  .strict();

export async function PUT(request: Request) {
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

    const body = await request.json();
    const parsed = updateLeaveSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.errors },
        { status: 400 }
      );
    }

    const { leaveId, status, remark } = parsed.data;

    const leave = await db.leave.findUnique({
      where: { leaveId },
      include: {
        Employee: {
          select: {
            reportingManager: true,
            store: true,
            profile: true,
          },
        },
      },
    });

    if (!leave || leave.status !== "pending") {
      return NextResponse.json(
        { error: leave ? "Leave not pending" : "Leave not found" },
        { status: 400 }
      );
    }

    const isHrCoordinator = leave.Employee.profile === "hr_coordinator";
    let updateData: any = { updatedAt: new Date() };

    const leaveHistory = await db.$transaction(async (tx) => {
      if (leave.approvalStage === "hr_coordinator") {
        if (status === "rejected") {
          updateData.status = "rejected";
          updateData.approvalStage = "rejected";
          updateData.approvedById = userId;
          updateData.approvedAt = new Date();
        } else {
          updateData.approvalStage = "manager";
          updateData.approvedById = userId;
          updateData.approvedAt = new Date();
          updateData.managerApprovalStatus = isHrCoordinator ? "approved" : "pending";
          if (isHrCoordinator) {
            updateData.status = "approved";
            updateData.approvalStage = "approved";
            updateData.managerApprovedById = userId;
            updateData.managerApprovedAt = new Date();
          }
        }
      } else if (leave.approvalStage === "manager") {
        updateData.managerApprovalStatus = status;
        updateData.managerApprovedById = userId;
        updateData.managerApprovedAt = new Date();
        updateData.status = status;
        updateData.approvalStage = status;
        if (status === "approved") {
          updateData.approvedById = userId;
          updateData.approvedAt = new Date();
        }
      } else {
        return NextResponse.json(
          { error: "Invalid approval stage" },
          { status: 400 }
        );
      }

      const updatedLeave = await tx.leave.update({
        where: { leaveId },
        data: updateData,
      });

      await tx.leaveHistory.create({
        data: {
          historyId: uuidv4(),
          leaveId,
          employeeId: leave.employeeId,
          status,
          remark: remark || `Leave ${status} by ${user.profile || "user"}`,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // Notify next approver or employee
      // if (updatedLeave.approvalStage === "manager" && !isHrCoordinator) {
      //   if (leave.Employee.reportingManager) {
      //     await tx.notification.create({
      //       data: {
      //         type: "leave_request",
      //         message: `Leave request from ${leave.employeeId} awaits manager approval`,
      //         createdAt: new Date(),
      //         read: false,
      //         userId: leave.Employee.reportingManager,
      //       },
      //     });
      //   }
      // } else if (
      //   updatedLeave.status === "approved" ||
      //   updatedLeave.status === "rejected"
      // ) {
      //   await tx.notification.create({
      //     data: {
      //       type: "leave_status",
      //       message: `Leave request for ${leave.effectiveDays} days ${status}${
      //         remark ? `: ${remark}` : ""
      //       }`,
      //       createdAt: new Date(),
      //       read: false,
      //       userId: leave.employeeId,
      //     },
      //   });
      // }

      return updatedLeave;
    });

    // Final approval actions
    if (
      leaveHistory.status === "approved" 
    ) {
      await db.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: leave.employeeId },
          data: { leaveDays: { decrement: leave.effectiveDays } },
        });

        const startDate = new Date(leave.startDate);
        const endDate = new Date(leave.endDate);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);

        for (
          let date = new Date(startDate);
          date <= endDate;
          date.setDate(date.getDate() + 1)
        ) {
          const dateStr = date.toISOString().split("T")[0];
          const holidays = await tx.holiday.findMany({
            where: { date: { equals: date } },
          });
          const isHoliday = holidays.length > 0;
          const calendar = leave.Employee.store
            ? await tx.calendar.findFirst({
                where: { store: { name: leave.Employee.store } },
                select: { id: true, weekdayOff: true },
              })
            : null;
          const isWeekdayOff =
            calendar &&
            date.toLocaleDateString("en-US", { weekday: "long" }) ===
              calendar.weekdayOff;

          if (isHoliday || isWeekdayOff) continue;

          if (
            (leave.isHalfDayStart &&
              date.getTime() === startDate.getTime() &&
              leave.startHalfPeriod === "second_half") ||
            (leave.isHalfDayEnd &&
              date.getTime() === endDate.getTime() &&
              leave.endHalfPeriod === "first_half")
          ) {
            continue;
          }

          await tx.attendance.upsert({
            where: { employeeId_date: { employeeId: leave.employeeId, date } },
            update: { status: "leave", updatedAt: new Date() },
            create: {
              attendanceId: uuidv4(),
              employeeId: leave.employeeId,
              date: new Date(date),
              status: "leave",
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          });
        }
      });
    }

    return NextResponse.json({ leave: leaveHistory }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


// import { NextResponse } from "next/server";
// import { getServerSession } from "next-auth";
// import { authOptions } from "@/app/api/auth/[...nextauth]/route";
// import { db } from "@/lib/db";
// import { v4 as uuidv4 } from "uuid";
// import { z } from "zod";
// import { checkPermission } from "@/lib/permissions";

// const updateLeaveSchema = z
//   .object({
//     leaveId: z.string(),
//     status: z.enum(["approved", "rejected"]),
//     remark: z.string().optional(),
//   })
//   .strict();

// export async function PUT(request: Request) {
//   try {
//     const session = await getServerSession(authOptions);
//     if (!session || !session.user || !session.user.userId) {
//       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//     }

//     const userId = session.user.userId as string;
//     const user = await db.user.findUnique({
//       where: { id: userId },
//       select: {
//         profile: true,
//         role: true,
//         store: true,
//       },
//     });

//     if (!user) {
//       return NextResponse.json({ error: "User not found" }, { status: 404 });
//     }

//     const body = await request.json();
//     const parsed = updateLeaveSchema.safeParse(body);
//     if (!parsed.success) {
//       return NextResponse.json(
//         { error: "Invalid input", details: parsed.error.errors },
//         { status: 400 }
//       );
//     }

//     const { leaveId, status, remark } = parsed.data;

//     const leave = await db.leave.findUnique({
//       where: { leaveId },
//       include: {
//         Employee: {
//           select: {
//             reportingManager: true,
//             store: true,
//             profile: true,
//           },
//         },
//       },
//     });

//     if (!leave || leave.status !== "pending") {
//       return NextResponse.json(
//         { error: leave ? "Leave not pending" : "Leave not found" },
//         { status: 400 }
//       );
//     }

//     // Authorization check
//     const permission = await checkPermission(session, "MANAGE_LEAVE_REQUESTS", {
//       reportingManagerId: leave.approvalStage === "manager" ? (leave.Employee.reportingManager ?? undefined) : undefined,
//       storeBoundCheck: leave.approvalStage === "hr" && (user.profile === "hr_coordinator" || user.profile === "store_director"),
//       targetUserId: leave.employeeId,
//     });
//     if (!permission.isAuthorized) {
//       return NextResponse.json(
//         { error: permission.error },
//         { status: permission.status }
//       );
//     }

//     const isHrEmployee = leave.Employee.profile === "hr_coordinator"||leave.Employee.profile === "hr_coordinator_manager";
//     let updateData: any = { updatedAt: new Date() };

//     const leaveHistory = await db.$transaction(async (tx) => {
//       if (leave.approvalStage === "manager") {
//         updateData.managerApprovalStatus = status;
//         updateData.managerApprovedById = userId;
//         updateData.managerApprovedAt = new Date();

//         if (status === "rejected") {
//           updateData.status = "rejected";
//           updateData.approvalStage = "rejected";
//         } else if (isHrEmployee) {
//           updateData.status = "approved";
//           updateData.approvalStage = "approved";
//           updateData.approvedById = userId;
//           updateData.approvedAt = new Date();
//         } else {
//           updateData.approvalStage = "hr";
//         }
//       } else if (leave.approvalStage === "hr") {
//         updateData.status = status;
//         updateData.approvalStage = status;
//         updateData.approvedById = userId;
//         updateData.approvedAt = new Date();
//       }

//       const updatedLeave = await tx.leave.update({
//         where: { leaveId },
//         data: updateData,
//       });

//       await tx.leaveHistory.create({
//         data: {
//           historyId: uuidv4(),
//           leaveId,
//           employeeId: leave.employeeId,
//           status,
//           remark: remark || null,
//           createdAt: new Date(),
//           updatedAt: new Date(),
//         },
//       });

//       // Notify next approver or employee
//       if (updatedLeave.approvalStage === "hr") {
//         const hrUsers = await tx.user.findMany({
//           where: {
//             userType: "hr",
//             store: leave.Employee.store,
//           },
//         });
//         // await tx.notification.createMany({
//         //   data: hrUsers.map((hr) => ({
//         //     type: "leave_request",
//         //     message: `Leave request from ${leave.employeeId} awaits HR approval`,
//         //     createdAt: new Date(),
//         //     read: false,
//         //     userId: hr.id,
//         //   })),
//         // });
//       } else if (
//         updatedLeave.status === "approved" ||
//         updatedLeave.status === "rejected"
//       ) {
//         // await tx.notification.create({
//         //   data: {
//         //     type: "leave_status",
//         //     message: `Leave request for ${leave.effectiveDays} days ${status}${
//         //       remark ? `: ${remark}` : ""
//         //     }`,
//         //     createdAt: new Date(),
//         //     read: false,
//         //     userId: leave.employeeId,
//         //   },
//         // });
//       }

//       return updatedLeave;
//     });

//     // Final approval actions
//     if (
//       leaveHistory.status === "approved" &&
//       leaveHistory.approvalStage === "approved"
//     ) {
//       await db.$transaction(async (tx) => {
//         await tx.user.update({
//           where: { id: leave.employeeId },
//           data: { leaveDays: { decrement: leave.effectiveDays } },
//         });

//         const startDate = new Date(leave.startDate);
//         const endDate = new Date(leave.endDate);
//         startDate.setHours(0, 0, 0, 0);
//         endDate.setHours(0, 0, 0, 0);

//         for (
//           let date = new Date(startDate);
//           date <= endDate;
//           date.setDate(date.getDate() + 1)
//         ) {
//           const dateStr = date.toISOString().split("T")[0];
//           const holidays = await tx.holiday.findMany({
//             where: { date: { equals: date } },
//           });
//           const isHoliday = holidays.length > 0;
//           const calendar = leave.Employee.store
//             ? await tx.calendar.findFirst({
//                 where: { store: { name: leave.Employee.store } },
//                 select: { id: true, weekdayOff: true },
//               })
//             : null;
//           const isWeekdayOff =
//             calendar &&
//             date.toLocaleDateString("en-US", { weekday: "long" }) ===
//               calendar.weekdayOff;

//           if (isHoliday || isWeekdayOff) continue;

//           if (
//             (leave.isHalfDayStart &&
//               date.getTime() === startDate.getTime() &&
//               leave.startHalfPeriod === "second_half") ||
//             (leave.isHalfDayEnd &&
//               date.getTime() === endDate.getTime() &&
//               leave.endHalfPeriod === "first_half")
//           ) {
//             continue;
//           }

//           await tx.attendance.upsert({
//             where: { employeeId_date: { employeeId: leave.employeeId, date } },
//             update: { status: "leave", updatedAt: new Date() },
//             create: {
//               attendanceId: uuidv4(),
//               employeeId: leave.employeeId,
//               date: new Date(date),
//               status: "leave",
//               createdAt: new Date(),
//               updatedAt: new Date(),
//             },
//           });
//         }
//       });
//     }

//     return NextResponse.json({ leave: leaveHistory }, { status: 200 });
//   } catch (error) {
//     console.error(error);
//     return NextResponse.json(
//       { error: "Internal server error" },
//       { status: 500 }
//     );
//   }
// }