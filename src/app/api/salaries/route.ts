import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { calculateSalaryData } from "@/lib/salaryUtils";
import { checkPermission } from "@/lib/permissions";

const salarySchema = z
  .object({
    employeeId: z.string(),
    month: z.number().int().min(1).max(12, "Month must be between 1 and 12"),
    year: z.number().int().min(2000, "Year must be valid"),
    basicSalary: z.number().positive("Basic salary must be positive"),
    perHourSalary: z.number().positive("Per hour salary must be positive"),
    overtimeRate: z
      .number()
      .nonnegative("Overtime rate must be non-negative")
      .optional()
      .default(0),
    bonus: z
      .number()
      .nonnegative("Bonus must be non-negative")
      .optional()
      .default(0),
    deductionOfHours: z
      .number()
      .nonnegative("Deduction of hours must be non-negative")
      .optional()
      .default(0),
    deductionOfDays: z
      .number()
      .nonnegative("Deduction of days must be non-negative")
      .optional()
      .default(0),
    overtimeHours: z
      .number()
      .nonnegative("Overtime hours must be non-negative")
      .optional()
      .default(0),
    publish: z.boolean().optional(),
    store: z.string().optional(),
  })
  .strict();

interface SalaryResponse {
  id: string;
  month: number;
  year: number;
  perHourSalary: number;
  perDaySalary: number;
  basicSalary: number;
  overtimeRate: number;
  bonus: number;
  absentDays: number;
  absentHours: number;
  deductionOfHours: number;
  deductionOfDays: number;
  totalDeductions: number;
  overtimeHours: number;
  overtimePayable: number;
  netSalary: number;
  expenses: number;
  salaryGT: number;
  createdAt: string;
  updatedAt: string;
  publish: boolean;
}

interface EmployeeSalaryResponse {
  employeeId: string;
  email: string;
  username: string;
  storeId: string | null;
  storeName: string | null;
  empNo: string;
  salaries: SalaryResponse[];
}

async function verifyHrAndStore(
  userId: string,
  profile: string | null | undefined
) {
  const store = await db.store.findFirst({
    where: {
      OR: [
        { hrs: { some: { id: userId } } },
        { employees: { some: { id: userId } } },
      ],
    },
    select: { id: true },
  });

  if (!store) {
    return {
      error: "Forbidden: User is not assigned to any store",
      status: 403,
    };
  }

  return { storeId: store.id };
}

export async function POST(req: Request) {
  try {
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

    const permission = await checkPermission(session, "MANAGE_SALARIES", {
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

    let storeId: string;
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
      storeId = verification.storeId;
    } else {
      if (!session.user.storeId) {
        return NextResponse.json(
          { error: "Forbidden: User is not assigned to any store" },
          { status: 403 }
        );
      }
      const store = await db.store.findUnique({
        where: { id: session.user.storeId },
        select: { id: true },
      });
      if (!store) {
        return NextResponse.json({ error: "Store not found" }, { status: 404 });
      }
      storeId = store.id;
    }

    const body = await req.json();
    const parsed = salarySchema.safeParse(body.payload);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.errors },
        { status: 400 }
      );
    }

    const {
      employeeId,
      month,
      year,
      basicSalary,
      perHourSalary,
      overtimeRate,
      bonus,
      deductionOfHours,
      deductionOfDays,
      overtimeHours,
      store,
    } = parsed.data;

    const employee = await db.user.findUnique({
      where: { id: employeeId },
      select: { storeId: true, username: true },
    });

    if (!employee) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

    if (
      (session.user.profile === "hr_coordinator" ||
        session.user.profile === "store_director") &&
      employee.storeId !== storeId
    ) {
      return NextResponse.json(
        { error: "Forbidden: Employee not in user's store" },
        { status: 403 }
      );
    }

    const existingSalary = await db.salary.findUnique({
      where: { employeeId_month_year: { employeeId, month, year } },
    });

    if (existingSalary) {
      return NextResponse.json(
        { error: "Salary record already exists for this employee and period" },
        { status: 400 }
      );
    }

    const salaryData = await calculateSalaryData(
      employeeId,
      month,
      year,
      basicSalary,
      perHourSalary,
      overtimeRate,
      bonus,
      deductionOfHours,
      deductionOfDays,
      overtimeHours
    );

    const salary = await db.$transaction(async (tx) => {
      const newSalary = await tx.salary.create({
        data: {
          id: uuidv4(),
          employeeId,
          username: employee.username,
          month,
          year,
          perHourSalary,
          perDaySalary: salaryData.perDaySalary,
          basicSalary,
          overtimeRate,
          bonus,
          absentDays: salaryData.absentDays,
          absentHours: salaryData.absentHours,
          deductionOfHours,
          deductionOfDays,
          totalDeductions: salaryData.totalDeductions,
          overtimeHours: salaryData.overtimeHours,
          overtimePayable: salaryData.overtimePayable,
          netSalary: salaryData.netSalary,
          expenses: salaryData.expenses,
          salaryGT: salaryData.salaryGT,
          createdAt: new Date(),
          updatedAt: new Date(),
          publish: false,
        },
      });

      return newSalary;
    });

    return NextResponse.json(salary, { status: 201 });
  } catch (error) {
    console.error("Error creating salary:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
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

    let storeId: string | null = null;
    const isHrUser = [
      "hr_coordinator",
      "hr_coordinator_manager",
      "store_director",
      "md",
    ].includes(session.user.profile || "");
    let isEmployee = false;

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
      storeId = verification.storeId;
    } else if (!isHrUser) {
      isEmployee = true;
    }

    const url = new URL(req.url);
    const employeeId = url.searchParams.get("employeeId");
    const allEmployees = url.searchParams.get("allEmployees") === "true";
    const month = url.searchParams.get("month");
    const year = url.searchParams.get("year");
    let store = url.searchParams.get("store");

    if (store === " ") {
      return NextResponse.json(
        { error: "Bad Request: Store parameter is invalid" },
        { status: 400 }
      );
    }

    const where: any = {};
    if (month) where.month = parseInt(month);
    if (year) where.year = parseInt(year);
    if (isEmployee) {
      where.employeeId = session.user.userId;
      where.publish = true;
    }

    if (allEmployees) {
      if (!isHrUser) {
        return NextResponse.json(
          {
            error: "Forbidden: Only HR users can fetch all employees' salaries",
          },
          { status: 403 }
        );
      }

      const employees = await db.user.findMany({
        where: {
          AND: [
            session.user.profile === "hr_coordinator" ||
            session.user.profile === "store_director"
              ? store === null
                ? { storeId }
                : { store }
              : {},
          ],
        },
        select: {
          id: true,
          email: true,
          empNo: true,
          username: true,
          storeId: true,
          store_info: { select: { name: true } },
        },
      });

      const salaries = await db.salary.findMany({
        where: {
          employeeId: { in: employees.map((emp) => emp.id) },
          ...where,
        },
        orderBy: [{ year: "asc" }, { month: "asc" }],
      });

      const response: EmployeeSalaryResponse[] = employees.map((employee) => ({
        employeeId: employee.id,
        empNo: employee.empNo ?? "",
        email: employee.email,
        username: employee.username,
        storeId: employee.storeId,
        storeName: employee.store_info?.name || null,
        salaries: salaries
          .filter((sal) => sal.employeeId === employee.id)
          .map((sal) => ({
            id: sal.id,
            month: sal.month,
            year: sal.year,
            perHourSalary: sal.perHourSalary,
            perDaySalary: sal.perDaySalary,
            basicSalary: sal.basicSalary,
            overtimeRate: sal.overtimeRate,
            bonus: sal.bonus,
            absentDays: sal.absentDays,
            absentHours: sal.absentHours,
            deductionOfHours: sal.deductionOfHours,
            deductionOfDays: sal.deductionOfDays,
            totalDeductions: sal.totalDeductions,
            overtimeHours: sal.overtimeHours,
            overtimePayable: sal.overtimePayable,
            netSalary: sal.netSalary,
            expenses: sal.expenses,
            salaryGT: sal.salaryGT,
            createdAt: sal.createdAt.toISOString(),
            updatedAt: sal.updatedAt.toISOString(),
            publish: sal.publish,
          })),
      }));

      return NextResponse.json(response);
    } else if (employeeId) {
      const employee = await db.user.findUnique({
        where: { id: employeeId },
        select: {
          id: true,
          empNo: true,
          email: true,
          username: true,
          storeId: true,
          store_info: { select: { name: true } },
        },
      });

      if (!employee) {
        return NextResponse.json(
          { error: "Employee not found" },
          { status: 404 }
        );
      }

      if (
        (session.user.profile === "hr_coordinator" ||
          session.user.profile === "store_director") &&
        employee.storeId !== storeId
      ) {
        return NextResponse.json(
          { error: "Forbidden: Employee not in user's store" },
          { status: 403 }
        );
      }

      if (isEmployee && employeeId !== session.user.userId) {
        return NextResponse.json(
          { error: "Forbidden: Employees can only view their own salaries" },
          { status: 403 }
        );
      }

      const salaries = await db.salary.findMany({
        where: {
          employeeId,
          ...where,
        },
        orderBy: [{ year: "asc" }, { month: "asc" }],
      });

      const response: EmployeeSalaryResponse = {
        employeeId: employee.id,
        empNo: employee.empNo ?? "",
        email: employee.email,
        username: employee.username,
        storeId: employee.storeId,
        storeName: employee.store_info?.name || null,
        salaries: salaries.map((sal) => ({
          id: sal.id,
          month: sal.month,
          year: sal.year,
          perHourSalary: sal.perHourSalary,
          perDaySalary: sal.perDaySalary,
          basicSalary: sal.basicSalary,
          overtimeRate: sal.overtimeRate,
          bonus: sal.bonus,
          absentDays: sal.absentDays,
          absentHours: sal.absentHours,
          deductionOfHours: sal.deductionOfHours,
          deductionOfDays: sal.deductionOfDays,
          totalDeductions: sal.totalDeductions,
          overtimeHours: sal.overtimeHours,
          overtimePayable: sal.overtimePayable,
          netSalary: sal.netSalary,
          expenses: sal.expenses,
          salaryGT: sal.salaryGT,
          createdAt: sal.createdAt.toISOString(),
          updatedAt: sal.updatedAt.toISOString(),
          publish: sal.publish,
        })),
      };

      return NextResponse.json(response);
    } else {
      return NextResponse.json(
        { error: "Employee ID or allEmployees=true is required" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error fetching salaries:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
