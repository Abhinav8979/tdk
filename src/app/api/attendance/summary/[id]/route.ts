import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";
import { checkPermission } from "@/lib/permissions";

interface AttendanceSummary {
  employeeId: string;
  fromDate: string;
  toDate: string;
  totalWorkingDays: number;
  daysPresent: number;
  attendancePercentage: number;
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.userId) {
      return NextResponse.json(
        { error: "Unauthorized: No active session found" },
        { status: 401 }
      );
    }

    const employeeId = params.id;

    if (!employeeId) {
      return NextResponse.json(
        { error: "Employee ID is required" },
        { status: 400 }
      );
    }

    // const privilegedProfiles = ["hr_coordinator", "store_director", "hr_coordinator_manager", "md"];
    const isPrivileged = session.user.profile;
    // const isPrivileged = session.user.profile && privilegedProfiles.includes(session.user.profile);

    // Non-privileged users can only view their own summary
    // if (!isPrivileged && employeeId !== session.user.userId) {
    //   return NextResponse.json(
    //     { error: "Forbidden: Can only view own attendance summary" },
    //     { status: 403 }
    //   );
    // }

    // Check permissions for privileged users
    if (isPrivileged) {
      const permission = await checkPermission(session, "VIEW_ATTENDANCE", {
        targetUserId: employeeId,
        storeBoundCheck: session.user.profile === "hr_coordinator" || session.user.profile === "store_director",
      });
      if (!permission.isAuthorized) {
        return NextResponse.json(
          { error: permission.error },
          { status: permission.status }
        );
      }
    }

    // Get current year
    const currentYear = new Date().getFullYear();
    const fromDate = new Date(currentYear, 0, 1); // January 1st of current year
    const toDate = new Date(); // Today

    // Validate employee exists
    const employee = await db.user.findUnique({
      where: { id: employeeId },
      include: {
        store_info: {
          include: {
            calendar: true,
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

    // Check if employee is assigned to a store
    if (!employee.store) {
      return NextResponse.json(
        { error: "Employee not assigned to a store" },
        { status: 400 }
      );
    }

    // Get all dates in the range
    const allDates = getDatesInRange(fromDate, toDate);

    // Get attendance records
    const attendanceRecords = await db.attendance.findMany({
      where: {
        employeeId: employeeId,
        date: {
          gte: fromDate,
          lte: toDate,
        },
        status: "present",
      },
    });

    // Get holidays if store has a calendar
    const holidays = employee.store_info?.calendar
      ? await db.holiday.findMany({
          where: {
            calendarId: employee.store_info.calendar.id,
            date: {
              gte: fromDate,
              lte: toDate,
            },
          },
        })
      : [];

    // Get approved leaves for this employee in date range
    const leaves = await db.leave.findMany({
      where: {
        employeeId: employeeId,
        status: "approved",
        OR: [
          {
            startDate: { lte: toDate },
            endDate: { gte: fromDate },
          },
        ],
      },
    });

    // Get weekday off from store calendar (default to Sunday if not set)
    const weekdayOff = employee.store_info?.calendar?.weekdayOff || "Sunday";

    // Calculate working days and present days
    let totalWorkingDays = 0;
    let daysPresent = 0;

    allDates.forEach((date) => {
      const dateStr = date.toISOString().split("T")[0];

      // Skip holidays
      const isHoliday = holidays.some(
        (h) => h.date.toISOString().split("T")[0] === dateStr
      );
      if (isHoliday) return;

      // Skip weekday off
      const dayOfWeek = date.toLocaleDateString("en-US", { weekday: "long" });
      if (dayOfWeek === weekdayOff) return;

      // Skip leave days
      const isOnLeave = leaves.some(
        (l) => date >= l.startDate && date <= l.endDate
      );
      if (isOnLeave) return;

      // Count as working day
      totalWorkingDays++;

      // Check if present
      const isPresent = attendanceRecords.some(
        (a) => a.date.toISOString().split("T")[0] === dateStr
      );
      if (isPresent) {
        daysPresent++;
      }
    });

    // Calculate attendance percentage
    const attendancePercentage =
      totalWorkingDays > 0
        ? Math.round((daysPresent / totalWorkingDays) * 100)
        : 0;

    const response: AttendanceSummary = {
      employeeId: employeeId,
      fromDate: fromDate.toISOString().split("T")[0],
      toDate: toDate.toISOString().split("T")[0],
      totalWorkingDays,
      daysPresent,
      attendancePercentage,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching attendance summary:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Helper function to get all dates in a range
function getDatesInRange(startDate: Date, endDate: Date): Date[] {
  const dates = [];
  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    dates.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return dates;
}