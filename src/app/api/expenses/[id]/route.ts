import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";
import { z } from "zod";
import { checkPermission } from "@/lib/permissions";

const updateExpenseSchema = z
  .object({
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
      .optional(),
    initialReading: z
      .number()
      .nonnegative("Initial reading must be non-negative")
      .optional(),
    finalReading: z
      .number()
      .nonnegative("Final reading must be non-negative")
      .optional(),
    rate: z.number().positive("Rate must be positive").optional(),
    miscellaneousExpense: z
      .number()
      .nonnegative("Miscellaneous expense must be non-negative")
      .optional(),
  })
  .strict()
  .refine(
    (data) => {
      if (
        data.initialReading !== undefined &&
        data.finalReading !== undefined
      ) {
        return data.finalReading >= data.initialReading;
      }
      return true;
    },
    {
      message: "Final reading must be greater than or equal to initial reading",
      path: ["finalReading"],
    }
  );

async function verifyHrAndStore(userId: string, profile: string | null | undefined) {
  const store = await db.store.findFirst({
    where: {
      OR: [
        { hrs: { some: { id: userId } } }, // For hr_coordinator
        { employees: { some: { id: userId } } }, // For store_director
      ],
    },
    select: { id: true, name: true },
  });

  if (!store) {
    return { error: "Forbidden: User is not assigned to any store", status: 403 };
  }

  return { storeId: store.id, storeName: store.name };
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.email || !session.user.userId) {
      return NextResponse.json(
        { error: "Unauthorized: No active session found" },
        { status: 401 }
      );
    }

    const privilegedProfiles = ["hr_coordinator", "store_director", "hr_coordinator_manager", "md"];
    const isPrivileged = session.user.profile && privilegedProfiles.includes(session.user.profile);

    if (!isPrivileged) {
      return NextResponse.json(
        { error: "Forbidden: Insufficient permissions to update expenses" },
        { status: 403 }
      );
    }

    const permission = await checkPermission(session, "MANAGE_EXPENSES", {
      storeBoundCheck: session.user.profile === "hr_coordinator" || session.user.profile === "store_director",
    });

    if (!permission.isAuthorized) {
      return NextResponse.json(
        { error: permission.error },
        { status: permission.status }
      );
    }

    const existingExpense = await db.expense.findUnique({
      where: { id: params.id },
      select: { employeeId: true },
    });

    if (!existingExpense) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    // Validate store for store-bound profiles
    if (session.user.profile === "hr_coordinator" || session.user.profile === "store_director") {
      const verification = await verifyHrAndStore(session.user.userId, session.user.profile);
      if ("error" in verification) {
        return NextResponse.json(
          { error: verification.error },
          { status: verification.status }
        );
      }

      const employee = await db.user.findUnique({
        where: { id: existingExpense.employeeId },
        select: { store: true },
      });

      if (!employee || employee.store !== verification.storeName) {
        return NextResponse.json(
          { error: "Forbidden: Employee not in your store" },
          { status: 403 }
        );
      }
    }

    const body = await req.json();
    const parsed = updateExpenseSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.errors },
        { status: 400 }
      );
    }

    const { date, initialReading, finalReading, rate, miscellaneousExpense } = parsed.data;

    const expense = await db.$transaction(async (tx) => {
      const currentExpense = await tx.expense.findUnique({
        where: { id: params.id },
      });

      if (!currentExpense) {
        throw new Error("Expense not found");
      }

      const updatedData: any = {};
      if (date) updatedData.date = new Date(date);
      if (initialReading !== undefined) updatedData.initialReading = initialReading;
      if (finalReading !== undefined) updatedData.finalReading = finalReading;
      if (rate !== undefined) updatedData.rate = rate;
      if (miscellaneousExpense !== undefined) updatedData.miscellaneousExpense = miscellaneousExpense;

      const newTotalDistance =
        finalReading !== undefined && initialReading !== undefined
          ? finalReading - initialReading
          : finalReading !== undefined
          ? finalReading - currentExpense.initialReading
          : initialReading !== undefined
          ? currentExpense.finalReading - initialReading
          : currentExpense.totalDistance;

      const newFuelTotal =
        (rate !== undefined ? rate : currentExpense.rate) * newTotalDistance;
      const newAmount =
        newFuelTotal +
        (miscellaneousExpense !== undefined
          ? miscellaneousExpense
          : currentExpense.miscellaneousExpense);

      updatedData.totalDistance = newTotalDistance;
      updatedData.fuelTotal = newFuelTotal;
      updatedData.amount = newAmount;

      const updatedExpense = await tx.expense.update({
        where: { id: params.id },
        data: updatedData,
      });

      return updatedExpense;
    });

    return NextResponse.json(expense);
  } catch (error) {
    console.error("Error updating expense:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}