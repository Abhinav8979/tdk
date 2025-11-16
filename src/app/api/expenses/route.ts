import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { checkPermission } from "@/lib/permissions";
import { PrismaClientInitializationError } from "@prisma/client/runtime/library";

const expenseSchema = z
  .object({
    employeeId: z.string(),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
    initialReading: z
      .number()
      .nonnegative("Initial reading must be non-negative"),
    finalReading: z.number().nonnegative("Final reading must be non-negative"),
    rate: z.number().positive("Rate must be positive"),
    miscellaneousExpense: z
      .number()
      .nonnegative("Miscellaneous expense must be non-negative")
      .optional()
      .default(0),
  })
  .strict()
  .refine((data) => data.finalReading >= data.initialReading, {
    message: "Final reading must be greater than or equal to initial reading",
    path: ["finalReading"],
  });

const querySchema = z
  .object({
    employeeId: z.string().optional(),
    id: z.string().optional(), // Support `id` as alias for `employeeId`
    allEmployees: z.enum(["true", "false"]).optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    limit: z.string().regex(/^\d+$/, "Limit must be a number").optional(),
    offset: z.string().regex(/^\d+$/, "Offset must be a number").optional(),
    storeName: z.string(),
  })
  .refine(
    (data) => {
      if (!data.employeeId && !data.id && data.allEmployees !== "true") {
        return false;
      }
      return true;
    },
    {
      message: "Employee ID or allEmployees=true is required",
    }
  )
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

const BATCH_SIZE = 50; // For large queries

function normalizeDateToUTC(date: Date): Date {
  const utcDate = new Date(date.getTime());
  utcDate.setUTCHours(0, 0, 0, 0); // Start of day in UTC
  return utcDate;
}

export async function POST(req: Request) {
  try {
    await db.$connect().catch((error) => {
      console.error("Failed to connect to database:", error);
      throw new Error(`Database connection failed: ${error.message}`);
    });

    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.email) {
      return NextResponse.json(
        { error: "Unauthorized: No active session" },
        { status: 401 }
      );
    }

    // Check permission for creating expenses
    const permissionCheck = await checkPermission(session, "MANAGE_SALARIES", {
      storeBoundCheck: true,
    });
    if (!permissionCheck.isAuthorized) {
      return NextResponse.json(
        { error: permissionCheck.error },
        { status: permissionCheck.status }
      );
    }

    const currentUser = await db.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        profile: true,
        store: true,
      },
    });

    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await req.json();
    const parsed = expenseSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.errors },
        { status: 400 }
      );
    }

    const {
      employeeId,
      date,
      initialReading,
      finalReading,
      rate,
      miscellaneousExpense,
    } = parsed.data;

    // Verify employee is in the same store as HR
    const employee = await db.user.findUnique({
      where: { id: employeeId },
      select: { store: true },
    });

    if (!employee) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

    if (currentUser.store !== employee.store) {
      return NextResponse.json(
        { error: "Forbidden: Employee not in your store" },
        { status: 403 }
      );
    }

    const expenseDate = normalizeDateToUTC(new Date(date));

    const totalDistance = finalReading - initialReading;
    const fuelTotal = totalDistance * rate;
    const amount = fuelTotal + miscellaneousExpense;

    // Check for existing expense
    const existingExpense = await db.expense.findFirst({
      where: { employeeId, date: expenseDate },
    });

    let expense;
    if (existingExpense) {
      // Update existing expense
      expense = await db.expense.update({
        where: { id: existingExpense.id },
        data: {
          initialReading,
          finalReading,
          totalDistance,
          rate,
          fuelTotal,
          amount,
          miscellaneousExpense,
          updatedAt: new Date(),
        },
      });
      console.log(
        `Updated expense ${expense.id} for employee ${employeeId} on ${date}`
      );
    } else {
      // Create new expense
      expense = await db.expense.create({
        data: {
          id: uuidv4(),
          employeeId,
          date: expenseDate,
          initialReading,
          finalReading,
          totalDistance,
          rate,
          fuelTotal,
          amount,
          miscellaneousExpense,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
      console.log(
        `Created expense ${expense.id} for employee ${employeeId} on ${date}`
      );
    }

    return NextResponse.json(expense, { status: 201 });
  } catch (error: any) {
    console.error("Error processing expense:", error);
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

export async function PUT(req: Request) {
  try {
    await db.$connect().catch((error) => {
      console.error("Failed to connect to database:", error);
      throw new Error(`Database connection failed: ${error.message}`);
    });

    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.email) {
      return NextResponse.json(
        { error: "Unauthorized: No active session" },
        { status: 401 }
      );
    }

    // Check permission for updating expenses
    const permissionCheck = await checkPermission(session, "MANAGE_SALARIES", {
      storeBoundCheck: true,
    });
    if (!permissionCheck.isAuthorized) {
      return NextResponse.json(
        { error: permissionCheck.error },
        { status: permissionCheck.status }
      );
    }

    const currentUser = await db.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        profile: true,
        store: true,
      },
    });

    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await req.json();
    const parsed = expenseSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.errors },
        { status: 400 }
      );
    }

    const {
      employeeId,
      date,
      initialReading,
      finalReading,
      rate,
      miscellaneousExpense,
    } = parsed.data;

    // Verify employee is in the same store as HR
    const employee = await db.user.findUnique({
      where: { id: employeeId },
      select: { store: true },
    });

    if (!employee) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

    if (currentUser.store !== employee.store) {
      return NextResponse.json(
        { error: "Forbidden: Employee not in your store" },
        { status: 403 }
      );
    }

    const expenseDate = normalizeDateToUTC(new Date(date));

    // Check for existing expense
    const existingExpense = await db.expense.findFirst({
      where: { employeeId, date: expenseDate },
    });

    if (!existingExpense) {
      return NextResponse.json(
        { error: "Expense not found for the given employee and date" },
        { status: 404 }
      );
    }

    const totalDistance = finalReading - initialReading;
    const fuelTotal = totalDistance * rate;
    const amount = fuelTotal + miscellaneousExpense;

    // Update expense
    const expense = await db.expense.update({
      where: { id: existingExpense.id },
      data: {
        initialReading,
        finalReading,
        totalDistance,
        rate,
        fuelTotal,
        amount,
        miscellaneousExpense,
        updatedAt: new Date(),
      },
    });
    console.log(
      `Updated expense ${expense.id} for employee ${employeeId} on ${date}`
    );

    return NextResponse.json(expense);
  } catch (error: any) {
    console.error("Error updating expense:", error);
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

export async function GET(req: Request) {
  try {
    await db.$connect().catch((error) => {
      console.error("Failed to connect to database:", error);
      throw new Error(`Database connection failed: ${error.message}`);
    });

    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.email) {
      return NextResponse.json(
        { error: "Unauthorized: No active session" },
        { status: 401 }
      );
    }

    // Check permission for viewing expenses
    const permissionCheck = await checkPermission(session, "FETCH_ALL", {
      storeBoundCheck: true,
    });
    if (!permissionCheck.isAuthorized) {
      return NextResponse.json(
        { error: permissionCheck.error },
        { status: permissionCheck.status }
      );
    }

    const currentUser = await db.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        profile: true,
        store: true,
      },
    });

    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const url = new URL(req.url);
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
      id,
      allEmployees,
      startDate,
      endDate,
      limit,
      offset,
      storeName,
    } = parsed.data;
    const effectiveEmployeeId = employeeId || id; // Support `id` as alias
    const isAllEmployees = allEmployees === "true";
    const limitNum = limit ? parseInt(limit) : 100;
    const offsetNum = offset ? parseInt(offset) : 0;

    // Normalize dates to UTC
    const start = startDate
      ? normalizeDateToUTC(new Date(startDate))
      : normalizeDateToUTC(new Date(0));
    const end = endDate
      ? normalizeDateToUTC(new Date(endDate))
      : normalizeDateToUTC(new Date());
    end.setUTCHours(23, 59, 59, 999);

    if (isAllEmployees) {
      let employees: {
        id: string;
        email: string;
        username: string;
        store: string | null;
        store_info: { name: string | null } | null;
      }[] = [];
      let skip = offsetNum;
      let hasMore = true;

      while (hasMore) {
        const batchEmployees = await db.user.findMany({
          where: {
            store: storeName ,
          },
          select: {
            id: true,
            email: true,
            username: true,
            store: true,
            store_info: { select: { name: true } },
          },
          take: Math.min(limitNum, BATCH_SIZE),
          skip,
        });

        employees = employees.concat(batchEmployees);
        skip += BATCH_SIZE;
        hasMore =
          batchEmployees.length === BATCH_SIZE && employees.length < limitNum;
      }

      employees = employees.slice(0, limitNum);

      if (!employees.length) {
        return NextResponse.json([]);
      }

      const employeeIds = employees.map((e) => e.id);
      let expenses: any[] = [];
      skip = 0;
      hasMore = true;

      while (hasMore) {
        const batchExpenses = await db.expense.findMany({
          where: {
            employeeId: { in: employeeIds },
            date:
              startDate === endDate
                ? { equals: start }
                : { gte: start, lte: end },
          },
          orderBy: [{ date: "asc" }],
          take: BATCH_SIZE,
          skip,
        });

        expenses = expenses.concat(batchExpenses);
        skip += BATCH_SIZE;
        hasMore = batchExpenses.length === BATCH_SIZE;
      }

      const istOffset = 5.5 * 60 * 60 * 1000;
      const response = employees.map((employee) => ({
        employeeId: employee.id,
        email: employee.email,
        username: employee.username,
        storeId: employee.store,
        storeName: employee.store_info?.name || null,
        expenses: expenses
          .filter((exp) => exp.employeeId === employee.id)
          .map((exp) => ({
            ...exp,
            date: new Date(exp.date.getTime() + istOffset)
              .toISOString()
              .split("T")[0],
            createdAt: new Date(
              exp.createdAt.getTime() + istOffset
            ).toISOString(),
            updatedAt: new Date(
              exp.updatedAt.getTime() + istOffset
            ).toISOString(),
          })),
      }));

      return NextResponse.json(response);
    } else if (effectiveEmployeeId) {
      const employee = await db.user.findUnique({
        where: { id: effectiveEmployeeId },
        select: {
          id: true,
          email: true,
          username: true,
          store: true,
          store_info: { select: { name: true } },
        },
      });

      if (!employee) {
        return NextResponse.json(
          { error: "Employee not found" },
          { status: 404 }
        );
      }

      const expenses = await db.expense.findMany({
        where: {
          employeeId: effectiveEmployeeId,
          date:
            startDate === endDate
              ? { equals: start }
              : { gte: start, lte: end },
        },
        orderBy: [{ date: "asc" }],
      });

      const istOffset = 5.5 * 60 * 60 * 1000;
      const response = {
        employeeId: employee.id,
        email: employee.email,
        username: employee.username,
        storeId: employee.store,
        storeName: employee.store_info?.name || null,
        expenses: expenses.map((exp) => ({
          ...exp,
          date: new Date(exp.date.getTime() + istOffset)
            .toISOString()
            .split("T")[0],
          createdAt: new Date(
            exp.createdAt.getTime() + istOffset
          ).toISOString(),
          updatedAt: new Date(
            exp.updatedAt.getTime() + istOffset
          ).toISOString(),
        })),
      };

      return NextResponse.json(response);
    }

    return NextResponse.json(
      { error: "Employee ID or allEmployees=true is required" },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("Error fetching expenses:", error);
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
