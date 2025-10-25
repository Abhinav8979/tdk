import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";
import { z } from "zod";
import { checkPermission } from "@/lib/permissions";
import { PrismaClientInitializationError } from "@prisma/client/runtime/library";

interface AttendanceResponse {
  attendanceId?: string;
  date: string;
  status: string | null;
  inTime?: string | null;
  outTime?: string | null;
  isLateEntry?: boolean;
  isEarlyExit?: boolean;
  createdAt?: string;
  updatedAt?: string | null;
  lateEntryThreshold?: number;
  earlyExitThreshold?: number;
}

interface EmployeeAttendance {
  employeeId: string;
  email: string;
  username: string;
  storeId?: string | null;
  storeName?: string | null;
  attendance: AttendanceResponse[];
}

const querySchema = z.object({
  employeeId: z.string().optional(),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Start date must be in YYYY-MM-DD format")
    .optional(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "End date must be in YYYY-MM-DD format")
    .optional(),
  allEmployees: z.enum(["true", "false"]).optional(),
  storeId: z.string().optional(),
  limit: z.string().regex(/^\d+$/, "Limit must be a number").optional(),
  offset: z.string().regex(/^\d+$/, "Offset must be a number").optional(),
});

const BATCH_SIZE = 50; // Reduced for Supabase's connection limit

async function verifyHrAndStore(
  userId: string,
  profile: string | null | undefined
) {
  try {
    const store = await db.store.findFirst({
      where: {
        OR: [
          { hrs: { some: { id: userId } } },
          { employees: { some: { id: userId } } },
        ],
      },
      select: { id: true, name: true },
    });

    if (!store) {
      return {
        error: "Forbidden: User is not assigned to any store",
        status: 403,
      };
    }

    return { storeId: store.id, storeName: store.name };
  } catch (error) {
    console.error("Error verifying HR and store:", error);
    throw error;
  }
}

function normalizeDateToUTC(date: Date): Date {
  const utcDate = new Date(date.getTime());
  utcDate.setUTCHours(0, 0, 0, 0); // Start of day in UTC
  return utcDate;
}

function getDatesInRange(startDate: Date, endDate: Date): Date[] {
  const dates = [];
  const currentDate = normalizeDateToUTC(startDate);
  const end = normalizeDateToUTC(endDate);

  while (currentDate <= end) {
    dates.push(new Date(currentDate));
    currentDate.setUTCDate(currentDate.getUTCDate() + 1);
  }

  console.log(
    `Generated dates: ${dates
      .map((d) => d.toISOString().split("T")[0])
      .join(", ")}`
  );
  return dates;
}

export async function GET(request: Request) {
  try {
    console.log("reached");
    await db.$connect().catch((error) => {
      console.error("Failed to connect to database:", error);
      throw new Error(`Database connection failed: ${error.message}`);
    });

    const session = await getServerSession(authOptions);
    if (
      !session ||
      !session.user ||
      !session.user.email ||
      !session.user.userId
    ) {
      return NextResponse.json(
        { error: "Unauthorized: No active session found" },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const queryParams = Object.fromEntries(url.searchParams);
    const parsed = querySchema.safeParse(queryParams);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: parsed.error.errors },
        { status: 400 }
      );
    }

    const {
      employeeId,
      startDate,
      endDate,
      allEmployees,
      storeId,
      limit,
      offset,
    } = parsed.data;
    const isAllEmployees = allEmployees === "true";
    const limitNum = limit ? parseInt(limit) : 100;
    const offsetNum = offset ? parseInt(offset) : 0;

    const start = startDate
      ? normalizeDateToUTC(new Date(startDate))
      : normalizeDateToUTC(new Date(0));
    const end = endDate
      ? normalizeDateToUTC(new Date(endDate))
      : normalizeDateToUTC(new Date());
    if (start > end) {
      return NextResponse.json(
        { error: "startDate must be before endDate" },
        { status: 400 }
      );
    }

    const privilegedProfiles = [
      "hr_coordinator",
      "store_director",
      "hr_coordinator_manager",
      "md",
    ];
    const isPrivileged =
      session.user.profile && privilegedProfiles.includes(session.user.profile);

    if (isAllEmployees && !isPrivileged) {
      return NextResponse.json(
        {
          error:
            "Forbidden: Only privileged profiles can fetch all employees' attendance",
        },
        { status: 403 }
      );
    }

    if (isAllEmployees) {
      const permission = await checkPermission(session, "VIEW_ATTENDANCE", {
        storeBoundCheck:
          session.user.profile === "hr_coordinator" ||
          session.user.profile === "store_director",
      });
      if (!permission.isAuthorized) {
        return NextResponse.json(
          { error: permission.error },
          { status: permission.status }
        );
      }

      let hrStore: { storeId: string; storeName: string } | null = null;
      if (
        session.user.profile === "hr_coordinator" ||
        session.user.profile === "store_director"
      ) {
        const verification = await verifyHrAndStore(
          session.user.userId,
          session.user.profile
        );
        if ("error" in verification) {
          return NextResponse.json(
            { error: verification.error },
            { status: verification.status }
          );
        }
        hrStore = verification;
      }

      let allEmployees: {
        id: string;
        email: string;
        username: string;
        storeId: string | null;
        store_info: {
          name: string | null;
          lateEntryThreshold: number | null;
          earlyExitThreshold: number | null;
        } | null;
      }[] = [];
      let skip = offsetNum;
      let hasMore = true;

      while (hasMore) {
        const employees = await db.user.findMany({
          where: {
            AND: [
              storeId ? { storeId } : {},
              hrStore ? { storeId: hrStore.storeId } : {},
            ],
          },
          select: {
            id: true,
            email: true,
            username: true,
            storeId: true,
            store_info: {
              select: {
                name: true,
                lateEntryThreshold: true,
                earlyExitThreshold: true,
              },
            },
          },
          take: Math.min(limitNum, BATCH_SIZE),
          skip,
        });

        allEmployees = allEmployees.concat(employees);
        skip += BATCH_SIZE;
        hasMore =
          employees.length === BATCH_SIZE && allEmployees.length < limitNum;
      }

      allEmployees = allEmployees.slice(0, limitNum);

      if (!allEmployees.length) {
        return NextResponse.json([]);
      }

      const employeeIds = allEmployees.map((e) => e.id);
      let attendanceRecords: {
        employeeId: string;
        attendanceId: string;
        date: Date;
        status: string | null;
        inTime: Date | null;
        outTime: Date | null;
        isLateEntry: boolean | null;
        isEarlyExit: boolean | null;
        createdAt: Date;
        updatedAt: Date | null;
      }[] = [];
      skip = 0;
      hasMore = true;

      while (hasMore) {
        const batchRecords = await db.attendance.findMany({
          where: {
            employeeId: { in: employeeIds },
            date: {
              gte: start,
              lte: new Date(end.getTime() + 24 * 60 * 60 * 1000 - 1), // Include end of day
            },
          },
          select: {
            employeeId: true,
            attendanceId: true,
            date: true,
            status: true,
            inTime: true,
            outTime: true,
            isLateEntry: true,
            isEarlyExit: true,
            createdAt: true,
            updatedAt: true,
          },
          take: BATCH_SIZE,
          skip,
        });

        attendanceRecords = attendanceRecords.concat(batchRecords);
        skip += BATCH_SIZE;
        hasMore = batchRecords.length === BATCH_SIZE;
      }

      const allDates = getDatesInRange(start, end);

      const response: EmployeeAttendance[] = allEmployees.map((employee) => {
        const lateEntryThreshold =
          employee.store_info?.lateEntryThreshold ?? 10;
        const earlyExitThreshold =
          employee.store_info?.earlyExitThreshold ?? 10;

        const attendance: AttendanceResponse[] = allDates.map((date) => {
          const dateStr = date.toISOString().split("T")[0];

          const attendance = attendanceRecords.find((a) => {
            // Compare dates in UTC
            return (
              a.employeeId === employee.id &&
              a.date.toISOString().split("T")[0] === dateStr
            );
          });

          if (attendance) {
            const istOffset = 5.5 * 60 * 60 * 1000;
            return {
              attendanceId: attendance.attendanceId,
              date: dateStr,
              status: attendance.status,
              inTime: attendance.inTime
                ? new Date(
                    attendance.inTime.getTime() + istOffset
                  ).toISOString()
                : null,
              outTime: attendance.outTime
                ? new Date(
                    attendance.outTime.getTime() + istOffset
                  ).toISOString()
                : null,
              isLateEntry: attendance.isLateEntry ?? false,
              isEarlyExit: attendance.isEarlyExit ?? false,
              createdAt: new Date(
                attendance.createdAt.getTime() + istOffset
              ).toISOString(),
              updatedAt: attendance.updatedAt
                ? new Date(
                    attendance.updatedAt.getTime() + istOffset
                  ).toISOString()
                : null,
              lateEntryThreshold,
              earlyExitThreshold,
            };
          }

          return {
            date: dateStr,
            status: "absent",
            lateEntryThreshold,
            earlyExitThreshold,
          };
        });

        return {
          employeeId: employee.id,
          email: employee.email,
          username: employee.username,
          storeId: employee.storeId,
          storeName: employee.store_info?.name ?? null,
          attendance,
        };
      });

      return NextResponse.json(response);
    } else {
      if (!employeeId) {
        return NextResponse.json(
          { error: "Employee ID or allEmployees=true is required" },
          { status: 400 }
        );
      }

      if (!isPrivileged && employeeId !== session.user.userId) {
        return NextResponse.json(
          { error: "Forbidden: Can only view own attendance" },
          { status: 403 }
        );
      }

      const permission = await checkPermission(session, "VIEW_ATTENDANCE", {
        storeBoundCheck:
          session.user.profile === "hr_coordinator" ||
          session.user.profile === "store_director",
        targetUserId: employeeId,
      });
      if (!permission.isAuthorized) {
        return NextResponse.json(
          { error: permission.error },
          { status: permission.status }
        );
      }

      const employee = await db.user.findUnique({
        where: { id: employeeId },
        include: {
          store_info: {
            select: {
              name: true,
              lateEntryThreshold: true,
              earlyExitThreshold: true,
            },
          },
        },
      });

      if (!employee) {
        return NextResponse.json(
          { error: "Employee not found" },
          { status: 404 }
        );
      }

      const allDates = getDatesInRange(start, end);

      const attendanceRecords = await db.attendance.findMany({
        where: {
          employeeId,
          date: {
            gte: start,
            lte: new Date(end.getTime() + 24 * 60 * 60 * 1000 - 1), // Include end of day
          },
        },
        select: {
          employeeId: true,
          attendanceId: true,
          date: true,
          status: true,
          inTime: true,
          outTime: true,
          isLateEntry: true,
          isEarlyExit: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      const lateEntryThreshold = employee.store_info?.lateEntryThreshold ?? 10;
      const earlyExitThreshold = employee.store_info?.earlyExitThreshold ?? 10;

      const response: AttendanceResponse[] = allDates.map((date) => {
        const dateStr = date.toISOString().split("T")[0];

        const attendance = attendanceRecords.find((a) => {
          // Compare dates in UTC
          return (
            a.employeeId === employee.id &&
            a.date.toISOString().split("T")[0] === dateStr
          );
        });

        if (attendance) {
          const istOffset = 5.5 * 60 * 60 * 1000;
          return {
            attendanceId: attendance.attendanceId,
            date: dateStr,
            status: attendance.status,
            inTime: attendance.inTime
              ? new Date(attendance.inTime.getTime() + istOffset).toISOString()
              : null,
            outTime: attendance.outTime
              ? new Date(attendance.outTime.getTime() + istOffset).toISOString()
              : null,
            isLateEntry: attendance.isLateEntry ?? false,
            isEarlyExit: attendance.isEarlyExit ?? false,
            createdAt: new Date(
              attendance.createdAt.getTime() + istOffset
            ).toISOString(),
            updatedAt: attendance.updatedAt
              ? new Date(
                  attendance.updatedAt.getTime() + istOffset
                ).toISOString()
              : null,
            lateEntryThreshold,
            earlyExitThreshold,
          };
        }

        return {
          date: dateStr,
          status: "absent",
          lateEntryThreshold,
          earlyExitThreshold,
        };
      });

      return NextResponse.json({
        employeeId: employee.id,
        email: employee.email,
        username: employee.username,
        storeId: employee.storeId,
        storeName: employee.store_info?.name ?? null,
        attendance: response,
      });
    }
  } catch (error: any) {
    console.error("Error fetching attendance:", error);
    if (error instanceof PrismaClientInitializationError) {
      return NextResponse.json(
        { error: "Database connection failed", details: error.message },
        { status: 500 }
      );
    }
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}
