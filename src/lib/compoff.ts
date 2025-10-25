import { db } from "@/lib/db";

export async function updateCompOff(attendance: {
  employeeId: string;
  date: Date;
  inTime?: Date;
  outTime?: Date;
  status: string;
}) {
  try {
    if (attendance.status !== "present" || !attendance.inTime || !attendance.outTime) {
      return;
    }

    // Fetch employee and store calendar
    const employee = await db.user.findUnique({
      where: { id: attendance.employeeId },
      include: {
        store_info: {
          include: { calendar: true },
        },
      },
    });

    if (!employee || !employee.store_info?.calendar) {
      return;
    }

    const { calendar } = employee.store_info;

    // Check if the date is a holiday
    const isHoliday = await db.holiday.findFirst({
      where: {
        calendarId: calendar.id,
        date: { equals: attendance.date },
      },
    });

    // Check if the date is a weekdayOff
    const isWeekdayOff =
      new Date(attendance.date).toLocaleDateString("en-US", { weekday: "long" }) ===
      calendar.weekdayOff;

    if (!isHoliday && !isWeekdayOff) {
      return;
    }

    // Calculate work duration
    const workDurationMs = attendance.outTime.getTime() - attendance.inTime.getTime();
    const workHours = workDurationMs / (1000 * 60 * 60);

    // Assume full shift is expectedOutTime - expectedInTime (default 19:00 - 10:00 = 9 hours)
    const expectedShiftHours = employee.expectedOutTime && employee.expectedInTime
      ? (employee.expectedOutTime.getTime() - employee.expectedInTime.getTime()) / (1000 * 60 * 60)
      : 9;

    // Half-day if work duration < 50% of expected shift
    const compOffIncrement = workHours < expectedShiftHours * 0.5 ? 0.5 : 1.0;

    // Update compOff
    await db.user.update({
      where: { id: attendance.employeeId },
      data: {
        compOff: { increment: compOffIncrement },
      },
    });
  } catch (error) {
    console.error("Error updating compOff:", error);
  }
}