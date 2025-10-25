import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

const leaveSchema = z
  .object({
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
    isHalfDayStart: z.boolean().optional().default(false),
    isHalfDayEnd: z.boolean().optional().default(false),
    startHalfPeriod: z.enum(["first_half", "second_half"]).optional(),
    endHalfPeriod: z.enum(["first_half", "second_half"]).optional(),
    reason: z.string().min(1, "Reason is required"),
  })
  .strict()
  .refine(
    (data) => {
      if (data.isHalfDayStart && !data.startHalfPeriod) {
        return false;
      }
      if (data.isHalfDayEnd && !data.endHalfPeriod) {
        return false;
      }
      return true;
    },
    {
      message: "Half-day period is required for half-day leaves",
    }
  )
  .refine(
    (data) => {
      return new Date(data.startDate) <= new Date(data.endDate);
    },
    {
      message: "Start date must be before or equal to end date",
    }
  );

const querySchema = z
  .object({
    approvalStage: z.enum(["hr_coordinator", "manager"]).optional(),
    status: z.enum(["pending", "approved", "rejected"]).optional(),
    employeeId: z.string().optional(),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format").optional(),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format").optional(),
    limit: z.string().regex(/^\d+$/, "Limit must be a number").optional(),
    offset: z.string().regex(/^\d+$/, "Offset must be a number").optional(),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return new Date(data.startDate) <= new Date(data.endDate);
      }
      return true;
    },
    {
      message: "startDate must be before endDate",
    }
  );

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.userId as string;
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        profile: true,
        store: true,
        leaveDays: true,
        reportingManager: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = leaveSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.errors },
        { status: 400 }
      );
    }

    const {
      startDate,
      endDate,
      isHalfDayStart,
      isHalfDayEnd,
      startHalfPeriod,
      endHalfPeriod,
      reason,
    } = parsed.data;

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // Check for overlapping leaves
    const existingLeaves = await db.leave.findMany({
      where: {
        employeeId: userId,
        OR: [{ startDate: { lte: end }, endDate: { gte: start } }],
      },
    });

    if (existingLeaves.length > 0) {
      return NextResponse.json(
        { error: "You already have a leave request for this period" },
        { status: 400 }
      );
    }

    // Calculate effective days
    let effectiveDays = 0;
    const calendar = user.store
      ? await db.calendar.findFirst({
          where: { store: { name: user.store } },
          select: { id: true, weekdayOff: true },
        })
      : { weekdayOff: "Sunday", id: null };

    const holidays = calendar?.id
      ? await db.holiday.findMany({
          where: {
            calendarId: calendar.id,
            date: { gte: start, lte: end },
          },
          select: { date: true },
        })
      : [];

    const holidayDates = holidays.map(
      (h) => h.date.toISOString().split("T")[0]
    );
    const weekdayOff = calendar?.weekdayOff || "Sunday";

    for (
      let date = new Date(start);
      date <= end;
      date.setDate(date.getDate() + 1)
    ) {
      const dateStr = date.toISOString().split("T")[0];
      const isHoliday = holidayDates.includes(dateStr);
      const isWeekdayOff =
        date.toLocaleDateString("en-US", { weekday: "long" }) === weekdayOff;

      if (isHoliday || isWeekdayOff) continue;

      if (
        (isHalfDayStart &&
          date.getTime() === start.getTime() &&
          startHalfPeriod === "second_half") ||
        (isHalfDayEnd &&
          date.getTime() === end.getTime() &&
          endHalfPeriod === "first_half")
      ) {
        effectiveDays += 0.5;
      } else {
        effectiveDays += 1;
      }
    }

    if (effectiveDays > (user.leaveDays || 0)) {
      return NextResponse.json(
        { error: "Insufficient leave days" },
        { status: 400 }
      );
    }

    // Determine approval stage
    const isHrCoordinator = user.profile === "hr_coordinator";
    const approvalStage = isHrCoordinator ? "manager" : "hr_coordinator";

    // Find HR coordinator for the store (if not HR coordinator)
    let hrCoordinatorId: string | null = null;
    if (!isHrCoordinator && user.store) {
      const hrCoordinator = await db.user.findFirst({
        where: {
          store: user.store,
          profile: "hr_coordinator",
        },
        select: { id: true },
      });
      hrCoordinatorId = hrCoordinator?.id || null;
    }

    const leave = await db.$transaction(async (tx) => {
      const newLeave = await tx.leave.create({
        data: {
          leaveId: uuidv4(),
          employeeId: userId,
          startDate: start,
          endDate: end,
          isHalfDayStart,
          isHalfDayEnd,
          startHalfPeriod: isHalfDayStart ? startHalfPeriod : null,
          endHalfPeriod: isHalfDayEnd ? endHalfPeriod : null,
          reason,
          status: "pending",
          approvalStage,
          manager: user.reportingManager || null,
          managerApprovalStatus: isHrCoordinator ? "pending" : null,
          effectiveDays,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      await tx.leaveHistory.create({
        data: {
          historyId: uuidv4(),
          leaveId: newLeave.leaveId,
          employeeId: userId,
          status: "pending",
          remark: isHrCoordinator
            ? "Submitted for manager approval"
            : "Submitted for HR coordinator approval",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // Notify HR coordinator or manager
      // if (approvalStage === "hr_coordinator" && hrCoordinatorId) {
      //   await tx.notification.create({
      //     data: {
      //       type: "leave_request",
      //       message: `New leave request from ${userId} for ${effectiveDays} effective days`,
      //       createdAt: new Date(),
      //       read: false,
      //       userId: hrCoordinatorId,
      //     },
      //   });
      // } else if (user.reportingManager) {
      //   await tx.notification.create({
      //     data: {
      //       type: "leave_request",
      //       message: `New leave request from ${userId} for ${effectiveDays} effective days`,
      //       createdAt: new Date(),
      //       read: false,
      //       userId: user.reportingManager,
      //     },
      //   });
      // }

      return newLeave;
    });

    return NextResponse.json({ leave }, { status: 201 });
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

// const leaveSchema = z
//   .object({
//     startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
//     endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
//     isHalfDayStart: z.boolean().optional().default(false),
//     isHalfDayEnd: z.boolean().optional().default(false),
//     startHalfPeriod: z.enum(["first_half", "second_half"]).optional(),
//     endHalfPeriod: z.enum(["first_half", "second_half"]).optional(),
//     reason: z.string().min(1, "Reason is required"),
//   })
//   .strict()
//   .refine(
//     (data) => {
//       if (data.isHalfDayStart && !data.startHalfPeriod) {
//         return false;
//       }
//       if (data.isHalfDayEnd && !data.endHalfPeriod) {
//         return false;
//       }
//       return true;
//     },
//     {
//       message: "Half-day period is required for half-day leaves",
//     }
//   )
//   .refine(
//     (data) => {
//       return new Date(data.startDate) <= new Date(data.endDate);
//     },
//     {
//       message: "Start date must be before or equal to end date",
//     }
//   );

// export async function POST(request: Request) {
//   try {
//     const session = await getServerSession(authOptions);
//     if (!session || !session.user || !session.user.userId) {
//       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//     }

//     const userId = session.user.userId as string;
//     const permission = await checkPermission(session, "CREATE_LEAVE", {
//       targetUserId: userId,
//     });
//     if (!permission.isAuthorized) {
//       return NextResponse.json(
//         { error: permission.error },
//         { status: permission.status }
//       );
//     }

//     const user = await db.user.findUnique({
//       where: { id: userId },
//       select: {
//         profile: true,
//         store: true,
//         leaveDays: true,
//         reportingManager: true,
//       },
//     });

//     if (!user) {
//       return NextResponse.json({ error: "User not found" }, { status: 404 });
//     }

//     const body = await request.json();
//     const parsed = leaveSchema.safeParse(body);
//     if (!parsed.success) {
//       return NextResponse.json(
//         { error: "Invalid input", details: parsed.error.errors },
//         { status: 400 }
//       );
//     }

//     const {
//       startDate,
//       endDate,
//       isHalfDayStart,
//       isHalfDayEnd,
//       startHalfPeriod,
//       endHalfPeriod,
//       reason,
//     } = parsed.data;

//     const start = new Date(startDate);
//     const end = new Date(endDate);

//     // Check for overlapping leaves
//     const existingLeaves = await db.leave.findMany({
//       where: {
//         employeeId: userId,
//         OR: [{ startDate: { lte: end }, endDate: { gte: start } }],
//       },
//     });

//     if (existingLeaves.length > 0) {
//       return NextResponse.json(
//         { error: "You already have a leave request for this period" },
//         { status: 400 }
//       );
//     }

//     // Calculate effective days
//     let effectiveDays = 0;
//     const calendar = user.store
//       ? await db.calendar.findFirst({
//           where: { store: { name: user.store } },
//           select: { id: true, weekdayOff: true },
//         })
//       : { weekdayOff: "Sunday", id: null };

//     const holidays = calendar?.id
//       ? await db.holiday.findMany({
//           where: {
//             calendarId: calendar.id,
//             date: { gte: start, lte: end },
//           },
//           select: { date: true },
//         })
//       : [];

//     const holidayDates = holidays.map(
//       (h) => h.date.toISOString().split("T")[0]
//     );
//     const weekdayOff = calendar?.weekdayOff || "Sunday";

//     for (
//       let date = new Date(start);
//       date <= end;
//       date.setDate(date.getDate() + 1)
//     ) {
//       const dateStr = date.toISOString().split("T")[0];
//       const isHoliday = holidayDates.includes(dateStr);
//       const isWeekdayOff =
//         date.toLocaleDateString("en-US", { weekday: "long" }) === weekdayOff;

//       if (isHoliday || isWeekdayOff) continue;

//       if (
//         (isHalfDayStart &&
//           date.getTime() === start.getTime() &&
//           startHalfPeriod === "second_half") ||
//         (isHalfDayEnd &&
//           date.getTime() === end.getTime() &&
//           endHalfPeriod === "first_half")
//       ) {
//         effectiveDays += 0.5;
//       } else {
//         effectiveDays += 1;
//       }
//     }

//     if (effectiveDays > (user.leaveDays || 0)) {
//       return NextResponse.json(
//         { error: "Insufficient leave days" },
//         { status: 400 }
//       );
//     }

//     const leave = await db.$transaction(async (tx) => {
//       const newLeave = await tx.leave.create({
//         data: {
//           leaveId: uuidv4(),
//           employeeId: userId,
//           startDate: start,
//           endDate: end,
//           isHalfDayStart,
//           isHalfDayEnd,
//           startHalfPeriod: isHalfDayStart ? startHalfPeriod : null,
//           endHalfPeriod: isHalfDayEnd ? endHalfPeriod : null,
//           reason,
//           status: "pending",
//           approvalStage: "manager",
//           managerApprovalStatus: "pending",
//           effectiveDays,
//           createdAt: new Date(),
//           updatedAt: new Date(),
//         },
//       });

//       await tx.leaveHistory.create({
//         data: {
//           historyId: uuidv4(),
//           leaveId: newLeave.leaveId,
//           employeeId: userId,
//           status: "pending",
//           remark: "Submitted for manager approval",
//           createdAt: new Date(),
//           updatedAt: new Date(),
//         },
//       });

//       // Notify reporting manager
//       // if (user.reportingManager) {
//       //   await tx.notification.create({
//       //     data: {
//       //       type: "leave_request",
//       //       message: `New leave request from ${userId} for ${effectiveDays} effective days`,
//       //       createdAt: new Date(),
//       //       read: false,
//       //       userId: user.reportingManager,
//       //     },
//       //   });
//       // }

//       return newLeave;
//     });

//     return NextResponse.json({ leave }, { status: 201 });
//   } catch (error) {
//     console.error(error);
//     return NextResponse.json(
//       { error: "Internal server error" },
//       { status: 500 }
//     );
//   }
// }
