import { PrismaClient } from "@/generated/prisma";
import { format, parse } from "date-fns";
import { NextResponse } from "next/server";
import { z } from "zod";

const prisma = new PrismaClient();
const BATCH_SIZE = 100;

enum AttendanceStatus {
  WEEKDAY_OFF = "weekdayoff",
  HOLIDAY = "holiday",
}

interface StoreWithCalendar {
  id: string;
  calendar: {
    weekdayOff: string;
    holidays: Array<{ date: Date }>;
  } | null;
}

interface AttendanceRecord {
  attendanceId: string;
  employeeId: string;
  date: Date;
  status: AttendanceStatus;
  createdAt: Date;
}

const querySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
    .optional(),
});

function normalizeDateToIST(date: Date): Date {
  const istOffset = 5.5 * 60 * 60 * 1000; // 5 hours 30 minutes
  const istDate = new Date(date.getTime() + istOffset);
  istDate.setUTCHours(0, 0, 0, 0); // Start of day in UTC, aligns with IST 00:00:00
  return istDate;
}

function isSameDayIST(date1: Date, date2: Date): boolean {
  const istOffset = 5.5 * 60 * 60 * 1000;
  const d1 = new Date(date1.getTime() + istOffset);
  const d2 = new Date(date2.getTime() + istOffset);
  return (
    d1.getUTCFullYear() === d2.getUTCFullYear() &&
    d1.getUTCMonth() === d2.getUTCMonth() &&
    d1.getUTCDate() === d2.getUTCDate()
  );
}

async function markAttendanceForStore(
  storeId: string,
  date: Date,
  status: AttendanceStatus,
  retryCount: number = 3
): Promise<boolean> {
  try {
    const normalizedDate = normalizeDateToIST(date);
    console.log(
      `Marking attendance for store ${storeId} on ${format(
        normalizedDate,
        "yyyy-MM-dd"
      )}`
    );

    let skip = 0;
    let hasMore = true;

    while (hasMore) {
      const employees: { id: string }[] = await prisma.user.findMany({
        where: { storeId },
        select: { id: true },
        skip,
        take: BATCH_SIZE,
      });

      if (employees.length === 0) {
        hasMore = false;
        break;
      }

      const employeeIds = employees.map((emp) => emp.id);
      const existingAttendances: { employeeId: string }[] =
        await prisma.attendance.findMany({
          where: {
            employeeId: { in: employeeIds },
            date: { equals: normalizedDate },
          },
          select: { employeeId: true },
        });

      const existingEmployeeIds = new Set<string>(
        existingAttendances.map((att) => att.employeeId)
      );
      const employeesToMark = employees.filter(
        (emp) => !existingEmployeeIds.has(emp.id)
      );

      const attendanceRecords: AttendanceRecord[] = employeesToMark.map(
        (emp) => ({
          attendanceId: crypto.randomUUID(),
          employeeId: emp.id,
          date: normalizedDate,
          status,
          createdAt: new Date(),
        })
      );

      if (attendanceRecords.length > 0) {
        await prisma.$transaction(async (tx) => {
          await tx.attendance.createMany({
            data: attendanceRecords,
          });
        });
      }

      console.log(
        `Marked ${status} attendance for ${
          attendanceRecords.length
        } employees in store ${storeId} (batch ${skip / BATCH_SIZE + 1})`
      );

      skip += BATCH_SIZE;
      hasMore = employees.length === BATCH_SIZE;
    }

    return true;
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error(
      `Error marking attendance for store ${storeId}: ${errorMessage}`
    );
    if (retryCount > 0) {
      console.log(`Retrying store ${storeId}... Attempts left: ${retryCount}`);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return markAttendanceForStore(storeId, date, status, retryCount - 1);
    }
    return false;
  }
}

async function processStores(
  inputDate: string
): Promise<{ successful: number; failed: number }> {
  try {
    const parsedDate = parse(inputDate, "yyyy-MM-dd", new Date());
    if (isNaN(parsedDate.getTime())) {
      throw new Error("Invalid date format");
    }

    const normalizedDate = normalizeDateToIST(parsedDate);
    console.log(
      `Processing attendance for date: ${format(normalizedDate, "yyyy-MM-dd")}`
    );

    let skip = 0;
    let hasMore = true;
    const attendancePromises: Promise<boolean>[] = [];

    while (hasMore) {
      const stores: StoreWithCalendar[] = await prisma.store.findMany({
        include: {
          calendar: {
            include: { holidays: { select: { date: true } } },
          },
        },
        skip,
        take: BATCH_SIZE,
      });

      if (stores.length === 0) {
        hasMore = false;
        break;
      }

      for (const store of stores) {
        if (!store.calendar) continue;

        const weekdayOff = store.calendar.weekdayOff.toLowerCase();
        const targetDay = format(normalizedDate, "EEEE").toLowerCase();

        console.log(
          `Processing store ${store.id}: weekdayOff=${weekdayOff}, targetDay=${targetDay}`
        );

        if (weekdayOff === targetDay) {
          attendancePromises.push(
            markAttendanceForStore(
              store.id,
              normalizedDate,
              AttendanceStatus.WEEKDAY_OFF
            )
          );
          continue;
        }

        const isHoliday = store.calendar.holidays.some((holiday) =>
          isSameDayIST(holiday.date, normalizedDate)
        );

        if (isHoliday) {
          attendancePromises.push(
            markAttendanceForStore(
              store.id,
              normalizedDate,
              AttendanceStatus.HOLIDAY
            )
          );
        }
      }

      skip += BATCH_SIZE;
      hasMore = stores.length === BATCH_SIZE;
    }

    const results = await Promise.all(attendancePromises);
    const successCount = results.filter((result) => result).length;
    const failedCount = results.length - successCount;

    console.log(
      `Attendance job for ${format(
        normalizedDate,
        "yyyy-MM-dd"
      )} completed: ${successCount} stores processed successfully, ${failedCount} failed`
    );

    return { successful: successCount, failed: failedCount };
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Attendance job error:", errorMessage);
    throw new Error(errorMessage);
  }
}

export async function GET(req: Request) {
  try {
    await prisma.$connect();
    const url = new URL(req.url);
    const queryParams = Object.fromEntries(url.searchParams);
    const parsed = querySchema.safeParse(queryParams);

    if (!parsed.success) {
      return NextResponse.json(
        { message: "Invalid query parameters", errors: parsed.error.errors },
        { status: 400 }
      );
    }

    const { date } = parsed.data;
    const { successful, failed } = await processStores(
      date || format(new Date(), "yyyy-MM-dd")
    );

    return NextResponse.json(
      {
        message: `Attendance marking completed for ${
          date || format(new Date(), "yyyy-MM-dd")
        }`,
        successful,
        failed,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("GET handler error:", errorMessage);
    return NextResponse.json(
      { message: "Attendance job failed", error: errorMessage },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  return GET(req);
}
