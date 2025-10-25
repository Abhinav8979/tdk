import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";
import { z } from "zod";
import { Prisma } from "@/generated/prisma";
import { v4 as uuidv4 } from "uuid";
import { checkPermission } from "@/lib/permissions";

// Validation schema
const attendanceSchema = z
  .object({
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
      .optional(),
    userId: z.string().min(1, "User ID is required"),
  })
  .strict();

// Utility to check if attendance is allowed and if compOff applies
async function canMarkAttendance(employeeId: string, date: Date) {
  const startOfDay = new Date(date.setHours(0, 0, 0, 0));
  const endOfDay = new Date(date.setHours(23, 59, 59, 999));

  const user = await db.user.findUnique({
    where: { id: employeeId },
    select: {
      store: true,
      store_info: {
        select: {
          calendar: {
            select: {
              weekdayOff: true,
              holidays: {
                where: {
                  date: {
                    gte: startOfDay,
                    lte: endOfDay,
                  } as Prisma.DateTimeFilter,
                },
                select: { date: true },
              },
            },
          },
        },
      },
    },
  });

  if (!user?.store || !user.store_info?.calendar) {
    return {
      allowed: false,
      isHoliday: false,
      isWeekdayOff: false,
      reason: "Employee not assigned to a store with a calendar",
    };
  }

  const weekday = date.toLocaleString("en-US", { weekday: "long" });
  const isWeekdayOff = user.store_info.calendar.weekdayOff === weekday;
  const isHoliday = user.store_info.calendar.holidays.length > 0;

  return {
    allowed: true, // Allow attendance on holidays/weekdayOff for compOff
    isHoliday,
    isWeekdayOff,
    reason: null,
  };
}

// Utility to check late entry and early exit
async function checkAttendanceFlags(
  employeeId: string,
  storeName: string,
  inTime: Date | null,
  outTime: Date | null
) {
  const [user, store] = await Promise.all([
    db.user.findUnique({
      where: { id: employeeId },
      select: {
        expectedInTime: true,
        expectedOutTime: true,
      },
    }),
    db.store.findFirst({
      where: { name: storeName },
      select: {
        lateEntryThreshold: true,
        earlyExitThreshold: true,
      },
    }),
  ]);

  if (!user || !store) {
    return { isLateEntry: false, isEarlyExit: false };
  }

  const isLateEntry =
    inTime && user.expectedInTime && store.lateEntryThreshold
      ? inTime >
        new Date(
          inTime.getFullYear(),
          inTime.getMonth(),
          inTime.getDate(),
          user.expectedInTime.getHours(),
          user.expectedInTime.getMinutes() + store.lateEntryThreshold
        )
      : false;

  const isEarlyExit =
    outTime && user.expectedOutTime && store.earlyExitThreshold
      ? outTime <
        new Date(
          outTime.getFullYear(),
          outTime.getMonth(),
          outTime.getDate(),
          user.expectedOutTime.getHours(),
          user.expectedOutTime.getMinutes() - store.earlyExitThreshold
        )
      : false;

  return { isLateEntry, isEarlyExit };
}

// Utility to calculate and update compOff
async function calculateAndUpdateCompOff(
  employeeId: string,
  storeName: string,
  attendanceDate: Date,
  inTime: Date,
  outTime: Date,
  isHoliday: boolean,
  isWeekdayOff: boolean
) {
  if (!isHoliday && !isWeekdayOff) {
    return;
  }

  const user = await db.user.findUnique({
    where: { id: employeeId },
    select: {
      expectedInTime: true,
      expectedOutTime: true,
    },
  });

  if (!user) {
    return;
  }

  // Calculate work duration
  const workDurationMs = outTime.getTime() - inTime.getTime();
  const workHours = workDurationMs / (1000 * 60 * 60);

  // Assume full shift is expectedOutTime - expectedInTime (default 19:00 - 10:00 = 9 hours)
  const expectedShiftHours =
    user.expectedOutTime && user.expectedInTime
      ? (user.expectedOutTime.getTime() - user.expectedInTime.getTime()) /
        (1000 * 60 * 60)
      : 9;

  // Half-day if work duration < 50% of expected shift
  const compOffIncrement = workHours < expectedShiftHours * 0.5 ? 0.5 : 1.0;

  // Update compOff and create notification
  await db.$transaction([
    db.user.update({
      where: { id: employeeId },
      data: {
        compOff: { increment: compOffIncrement },
      },
    }),
    // db.notification.create({
    //   data: {
    //     id: uuidv4(),
    //     type: "compoff",
    //     message: `You earned ${compOffIncrement} comp-off day${compOffIncrement === 1 ? "" : "s"} for working on ${isHoliday ? "a holiday" : "a weekday off"}`,
    //     expiryTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    //     recipientType: "INDIVIDUAL",
    //     userId: employeeId,
    //     createdById: employeeId,
    //   },
    // }),
  ]);

  // Broadcast notification via Supabase Realtime
  // const notification = {
  //   id: uuidv4(),
  //   type: "compoff",
  //   message: `You earned ${compOffIncrement} comp-off day${compOffIncrement === 1 ? "" : "s"} for working on ${isHoliday ? "a holiday" : "a weekday off"}`,
  //   expiryTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  //   recipientType: "INDIVIDUAL",
  //   userId: employeeId,
  //   createdById: employeeId,
  // };

  // await supabase
  //   .channel(`notifications:user:${employeeId}`)
  //   .send({
  //     type: "broadcast",
  //     event: "new_notification",
  //     payload: notification,
  //   });
}

// POST: Mark in-time or out-time
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.userId) {
      return NextResponse.json(
        { error: "Unauthorized: No active session found" },
        { status: 401 }
      );
    }

    const permission = await checkPermission(session, "MARK_ATTENDANCE", {
      targetUserId: session.user.userId,
    });
    if (!permission.isAuthorized) {
      return NextResponse.json(
        { error: permission.error },
        { status: permission.status }
      );
    }

    const body = await req.json();
    console.log(body);
    const parsed = attendanceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.errors },
        { status: 400 }
      );
    }

    const { date: inputDate, userId } = parsed.data;
    const currentDate = new Date();
    const attendanceDate = inputDate ? new Date(inputDate) : currentDate;

    if (attendanceDate > currentDate) {
      return NextResponse.json(
        { error: "Cannot mark attendance for a future date" },
        { status: 400 }
      );
    }

    const startOfDay = new Date(attendanceDate.setHours(0, 0, 0, 0));

    const canMark = await canMarkAttendance(userId, new Date(attendanceDate));
    if (!canMark.allowed) {
      return NextResponse.json({ error: canMark.reason }, { status: 403 });
    }

    const employee = await db.user.findUnique({
      where: { id: session.user.userId },
      select: { id: true, store: true },
    });

    if (!employee?.store) {
      return NextResponse.json(
        { error: "Employee not assigned to a store" },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");

    if (action === "in") {
      const existingAttendance = await db.attendance.findUnique({
        where: {
          employeeId_date: {
            employeeId: session.user.userId,
            date: startOfDay,
          },
        },
      });

      if (existingAttendance?.inTime) {
        return NextResponse.json(
          { error: "In-time already marked for this date" },
          { status: 400 }
        );
      }

      const inTime = currentDate;
      const { isLateEntry } = await checkAttendanceFlags(
        employee.id,
        employee.store!, // Non-null assertion: store is guaranteed non-null by prior check
        inTime,
        null
      );

      const attendance = await db.attendance.upsert({
        where: {
          employeeId_date: {
            employeeId: session.user.userId,
            date: startOfDay,
          },
        },
        update: {
          inTime,
          isLateEntry,
          status: "present",
          updatedAt: currentDate,
        },
        create: {
          attendanceId: uuidv4(),
          employeeId: session.user.userId,
          date: startOfDay,
          inTime,
          isLateEntry,
          status: "present",
        },
        select: {
          attendanceId: true,
          date: true,
          inTime: true,
          isLateEntry: true,
          status: true,
        },
      });

      return NextResponse.json(attendance, { status: 200 });
    } else if (action === "out") {
      const existingAttendance = await db.attendance.findUnique({
        where: {
          employeeId_date: {
            employeeId: session.user.userId,
            date: startOfDay,
          },
        },
      });

      if (!existingAttendance) {
        return NextResponse.json(
          { error: "No in-time recorded for this date" },
          { status: 400 }
        );
      }

      if (existingAttendance.outTime) {
        return NextResponse.json(
          { error: "Out-time already marked for this date" },
          { status: 400 }
        );
      }

      const outTime = currentDate;
      const { isEarlyExit } = await checkAttendanceFlags(
        employee.id,
        employee.store!, // Non-null assertion: store is guaranteed non-null by prior check
        existingAttendance.inTime,
        outTime
      );

      const attendance = await db.$transaction(async (tx) => {
        const updatedAttendance = await tx.attendance.update({
          where: {
            attendanceId: existingAttendance.attendanceId,
          },
          data: {
            outTime,
            isEarlyExit,
            updatedAt: currentDate,
          },
          select: {
            attendanceId: true,
            date: true,
            inTime: true,
            outTime: true,
            isLateEntry: true,
            isEarlyExit: true,
            status: true,
          },
        });

        // Calculate compOff if on holiday or weekdayOff
        await calculateAndUpdateCompOff(
          employee.id,
          employee.store!, // Non-null assertion: store is guaranteed non-null by prior check
          startOfDay,
          existingAttendance.inTime!,
          outTime,
          canMark.isHoliday,
          canMark.isWeekdayOff
        );

        return updatedAttendance;
      });

      return NextResponse.json(attendance, { status: 200 });
    } else {
      return NextResponse.json(
        { error: "Invalid action: Must be 'in' or 'out'" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error marking attendance:", error);
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Attendance record already exists for this date" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
