import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";
import { z } from "zod";
import { calculateSalaryData } from "@/lib/salaryUtils";
import { checkPermission } from "@/lib/permissions";

const updateSalarySchema = z
  .object({
    basicSalary: z
      .number()
      .positive("Basic salary must be positive")
      .optional(),
    perHourSalary: z
      .number()
      .positive("Per hour salary must be positive")
      .optional(),
    overtimeRate: z
      .number()
      .nonnegative("Overtime rate must be non-negative")
      .optional(),
    bonus: z.number().nonnegative("Bonus must be non-negative").optional(),
    deductionOfHours: z
      .number()
      .nonnegative("Deduction of hours must be non-negative")
      .optional(),
    deductionOfDays: z
      .number()
      .nonnegative("Deduction of days must be non-negative")
      .optional(),
    overtimeHours: z
      .number()
      .nonnegative("Overtime hours must be non-negative")
      .optional(),
    publish: z.boolean().optional(),
  })
  .strict();

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

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
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

    const existingSalary = await db.salary.findUnique({
      where: { id: params.id },
      select: { employeeId: true, month: true, year: true },
    });

    if (!existingSalary) {
      return NextResponse.json(
        { error: "Salary record not found" },
        { status: 404 }
      );
    }

    const employee = await db.user.findUnique({
      where: { id: existingSalary.employeeId },
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

    const body = await req.json();
    console.log(body)
    const parsed = updateSalarySchema.safeParse(body.payload);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.errors },
        { status: 400 }
      );
    }

    const {
      basicSalary,
      perHourSalary,
      overtimeRate,
      bonus,
      deductionOfHours,
      deductionOfDays,
      overtimeHours,
      publish,
    } = parsed.data;

    const salary = await db.$transaction(async (tx) => {
      const currentSalary = await tx.salary.findUnique({
        where: { id: params.id },
      });

      if (!currentSalary) {
        throw new Error("Salary record not found");
      }

      const updatedData: any = {};
      const newBasicSalary = basicSalary ?? currentSalary.basicSalary;
      const newPerHourSalary = perHourSalary ?? currentSalary.perHourSalary;
      const newOvertimeRate = overtimeRate ?? currentSalary.overtimeRate;
      const newBonus = bonus ?? currentSalary.bonus;
      const newDeductionOfHours =
        deductionOfHours ?? currentSalary.deductionOfHours;
      const newDeductionOfDays =
        deductionOfDays ?? currentSalary.deductionOfDays;
      const newOvertimeHours = overtimeHours ?? currentSalary.overtimeHours;
      const newPublish = publish ?? currentSalary.publish;

      const salaryData = await calculateSalaryData(
        existingSalary.employeeId,
        existingSalary.month,
        existingSalary.year,
        newBasicSalary,
        newPerHourSalary,
        newOvertimeRate,
        newBonus,
        newDeductionOfHours,
        newDeductionOfDays,
        newOvertimeHours
      );

      updatedData.basicSalary = newBasicSalary;
      updatedData.perHourSalary = newPerHourSalary;
      updatedData.overtimeRate = newOvertimeRate;
      updatedData.bonus = newBonus;
      updatedData.perDaySalary = salaryData.perDaySalary;
      updatedData.absentDays = salaryData.absentDays;
      updatedData.absentHours = salaryData.absentHours;
      updatedData.deductionOfHours = newDeductionOfHours;
      updatedData.deductionOfDays = newDeductionOfDays;
      updatedData.overtimeHours = newOvertimeHours;
      updatedData.totalDeductions = salaryData.totalDeductions;
      updatedData.overtimePayable = salaryData.overtimePayable;
      updatedData.netSalary = salaryData.netSalary;
      updatedData.expenses = salaryData.expenses;
      updatedData.salaryGT = salaryData.salaryGT;
      updatedData.publish = newPublish;

      const updatedSalary = await tx.salary.update({
        where: { id: params.id },
        data: updatedData,
      });

      return updatedSalary;
    });

    return NextResponse.json(salary);
  } catch (error) {
    console.error("Error updating salary:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
