import { db } from "@/lib/db";

interface SalaryData {
  absentDays: number;
  absentHours: number;
  overtimeHours: number;
  perDaySalary: number;
  totalDeductions: number;
  overtimePayable: number;
  expenses: number;
  salaryGT: number;
  netSalary: number;
}

export async function calculateSalaryData(
  employeeId: string,
  month: number,
  year: number,
  basicSalary: number,
  perHourSalary: number,
  overtimeRate: number,
  bonus: number,
  deductionOfHours: number,
  deductionOfDays: number,
  overtimeHours: number = 0 // Default to 0
): Promise<SalaryData> {
  // Validate inputs
  if (month < 1 || month > 12) {
    throw new Error("Month must be between 1 and 12");
  }
  if (year < 2000 || year > new Date().getFullYear() + 1) {
    throw new Error("Invalid year");
  }
  if (basicSalary <= 0 || perHourSalary <= 0) {
    throw new Error("Basic salary and per hour salary must be positive");
  }

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0); // Last day of the month
  const daysInMonth = endDate.getDate();

  // Fetch employee data, attendance, leaves, overtime requests, and expenses
  const [
    employee,
    attendanceRecords,
    leaveRecords,
    overtimeRequests,
    expenses,
  ] = await db.$transaction([
    db.user.findUnique({
      where: { id: employeeId },
      select: { expectedInTime: true, expectedOutTime: true, storeId: true },
    }),
    db.attendance.findMany({
      where: {
        employeeId,
        date: { gte: startDate, lte: endDate },
      },
    }),
    db.leave.findMany({
      where: {
        employeeId,
        status: "approved",
        startDate: { lte: endDate },
        endDate: { gte: startDate },
      },
    }),
    db.overtimeRequest.findMany({
      where: {
        employeeId,
        status: "approved",
        date: { gte: startDate, lte: endDate },
      },
      select: { approvedHours: true },
    }),
    db.expense.findMany({
      where: {
        employeeId,
        date: { gte: startDate, lte: endDate },
      },
      select: { amount: true, miscellaneousExpense: true },
    }),
  ]);

  if (!employee) {
    throw new Error("Employee not found");
  }

  // Calculate expected daily hours
  const expectedDailyHours =
    employee.expectedOutTime && employee.expectedInTime
      ? (employee.expectedOutTime.getTime() -
          employee.expectedInTime.getTime()) /
        (1000 * 60 * 60)
      : 8;

  // Build set of leave dates
  const leaveDates = new Set<string>();
  for (const leave of leaveRecords) {
    const startDate = new Date(leave.startDate);
    const endDate = new Date(leave.endDate);
    for (
      let date = new Date(startDate);
      date <= endDate;
      date.setDate(date.getDate() + 1)
    ) {
      const dateStr = date.toISOString().split("T")[0];
      if (
        !(
          (leave.isHalfDayStart &&
            date.getTime() === startDate.getTime() &&
            leave.startHalfPeriod === "second_half") ||
          (leave.isHalfDayEnd &&
            date.getTime() === endDate.getTime() &&
            leave.endHalfPeriod === "first_half")
        )
      ) {
        leaveDates.add(dateStr);
      }
    }
  }

  // Calculate absent days and hours
  let absentDays = 0;
  let absentHours = 0;
  for (const record of attendanceRecords) {
    const recordDateStr = record.date.toISOString().split("T")[0];
    if (record.status === "absent" && !leaveDates.has(recordDateStr)) {
      absentDays += 1;
      absentHours += expectedDailyHours;
    } else if (
      record.inTime &&
      record.outTime &&
      !leaveDates.has(recordDateStr)
    ) {
      const hoursWorked =
        (record.outTime.getTime() - record.inTime.getTime()) / (1000 * 60 * 60);
      if (hoursWorked < expectedDailyHours) {
        absentHours += expectedDailyHours - hoursWorked;
      }
    }
  }

  // Use provided overtimeHours or calculate from approved requests
  const totalOvertimeHours = overtimeHours || overtimeRequests.reduce(
    (sum, req) => sum + (req.approvedHours || 0),
    0
  );

  // Calculate derived fields
  const perDaySalary = basicSalary / daysInMonth;
  const absentDaysDeduction = absentDays * perDaySalary;
  const absentHoursDeduction = absentHours * perHourSalary;
  const hoursDeduction = deductionOfHours * perHourSalary;
  const daysDeduction = deductionOfDays * perDaySalary;
  const totalDeductions = absentDaysDeduction + absentHoursDeduction + hoursDeduction + daysDeduction;
  const overtimePayable = totalOvertimeHours * (overtimeRate || perHourSalary * 1.5);
  const totalExpenses = expenses.reduce(
    (sum, exp) => sum + exp.amount + (exp.miscellaneousExpense || 0),
    0
  );
  const salaryGT = basicSalary + overtimePayable + bonus;
  const netSalary = Math.max(0, salaryGT - totalDeductions);

  return {
    absentDays,
    absentHours,
    overtimeHours: totalOvertimeHours,
    perDaySalary,
    totalDeductions,
    overtimePayable,
    expenses: totalExpenses,
    salaryGT,
    netSalary,
  };
}