import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { checkPermission } from "@/lib/permissions";

const overtimeRequestSchema = z
  .object({
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
    hours: z.number().positive("Hours must be positive"),
    remarks: z.string().min(1, "Remarks are required"),
  })
  .strict();

const querySchema = z
  .object({
    employeeId: z.string().optional(),
    status: z.enum(["pending", "approved", "rejected"]).optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    limit: z.string().regex(/^\d+$/, "Limit must be a number").optional(),
    offset: z.string().regex(/^\d+$/, "Offset must be a number").optional(),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return new Date(data.startDate) <= new Date(data.endDate);
      }
      return true;
    },
    { message: "startDate must be before endDate" }
  );

interface OvertimeRequestResponse {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  hours: number;
  remarks: string;
  status: string;
  manager?: string | null;
  approvedHours?: number | null;
  approverId?: string | null;
  approvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

async function verifyStore(userId: string, storeName: string | null | undefined) {
  const store = await db.store.findUnique({
    where: { name: storeName??(() => {
              throw new Error("Store name is required");
            })(), },
    select: { id: true },
  });

  if (!store) {
    return { error: `Store '${storeName}' not found`, status: 404 };
  }

  return { storeId: store.id };
}

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

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.email || !session.user.userId || !session.user.store) {
      return NextResponse.json(
        { error: "Unauthorized: No active session or store assignment found" },
        { status: 401 }
      );
    }

    const currentUser = await db.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        username: true,
      },
    });

    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify store exists
    const storeVerification = await verifyStore(session.user.userId, session.user.store);
    if ("error" in storeVerification) {
      return NextResponse.json(
        { error: storeVerification.error },
        { status: storeVerification.status }
      );
    }

    const body = await req.json();
    const parsed = overtimeRequestSchema.safeParse(body.data.payload);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.errors },
        { status: 400 }
      );
    }

    const { date, hours, remarks } = parsed.data;

    const overtimeRequest = await db.overtimeRequest.create({
      data: {
        id: uuidv4(),
        employeeId: currentUser.id,
        date: new Date(date),
        hours,
        remarks,
        manager: session.user.reportingManager || null,
        status: "pending",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(overtimeRequest, { status: 201 });
  } catch (error) {
    console.error("Error creating overtime request:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.email || !session.user.userId) {
      return NextResponse.json(
        { error: "Unauthorized: No active session found" },
        { status: 401 }
      );
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

    const { employeeId, status, startDate, endDate, limit, offset } = parsed.data;
    const limitNum = limit ? parseInt(limit) : 100;
    const offsetNum = offset ? parseInt(offset) : 0;

    const start = startDate ? new Date(startDate) : new Date(0);
    const end = endDate ? new Date(endDate) : new Date();

    let where: any = {
      date: { gte: start, lte: end },
    };
    if (status) where.status = status;

    // Check if user has a privileged profile
    const privilegedProfiles = ["hr_coordinator", "store_director", "hr_coordinator_manager", "md"];
    const isPrivileged = session.user.profile && privilegedProfiles.includes(session.user.profile);

    if (isPrivileged) {
      const permission = await checkPermission(session, "MANAGE_OVERTIME_REQUESTS", {
        storeBoundCheck: session.user.profile === "hr_coordinator" || session.user.profile === "store_director",
        targetUserId: employeeId,
      });
      if (!permission.isAuthorized) {
        return NextResponse.json(
          { error: permission.error },
          { status: permission.status }
        );
      }

      if (session.user.profile === "hr_coordinator" || session.user.profile === "store_director") {
        // Store-bound: Fetch requests for employees in their store
        const verification = await verifyHrAndStore(session.user.userId, session.user.profile);
        if ("error" in verification) {
          return NextResponse.json(
            { error: verification.error },
            { status: verification.status }
          );
        }

        const storeUsers = await db.user.findMany({
          where: { store: verification.storeName },
          select: { id: true },
        });

        where.employeeId = {
          in: storeUsers.map((e) => e.id),
        };

        if (employeeId) {
          where.employeeId = employeeId; // Already validated by checkPermission
        }
      } else {
        // Non-store-bound (hr_coordinator_manager, md): Fetch all requests
        if (employeeId) where.employeeId = employeeId;
      }
    } else {
      // Regular user: Fetch own requests and those of managed employees
      const managedEmployees = await db.user.findMany({
        where: { reportingManager: session.user.userId },
        select: { id: true },
      });

      where.OR = [
        { employeeId: session.user.userId },
        { employeeId: { in: managedEmployees.map((e) => e.id) } },
      ];

      if (employeeId) {
        if (
          employeeId !== session.user.userId &&
          !managedEmployees.some((e) => e.id === employeeId)
        ) {
          return NextResponse.json(
            {
              error: "Forbidden: Can only view own or managed employees' requests",
            },
            { status: 403 }
          );
        }
        where.employeeId = employeeId;
      }
    }

    const overtimeRequests = await db.overtimeRequest.findMany({
      where,
      select: {
        id: true,
        employeeId: true,
        date: true,
        hours: true,
        remarks: true,
        status: true,
        manager: true,
        approvedHours: true,
        approverId: true,
        approvedAt: true,
        createdAt: true,
        updatedAt: true,
        Employee: {
          select: { id: true, username: true },
        },
      },
      orderBy: [{ date: "asc" }],
      take: limitNum,
      skip: offsetNum,
    });

    const response: OvertimeRequestResponse[] = overtimeRequests.map((req) => ({
      id: req.id,
      employeeId: req.employeeId,
      employeeName: req.Employee.username,
      date: req.date.toISOString().split("T")[0],
      hours: req.hours,
      remarks: req.remarks,
      manager: req.manager || null,
      status: req.status,
      approvedHours: isPrivileged ? req.approvedHours : undefined,
      approverId: req.approverId,
      approvedAt: req.approvedAt?.toISOString() || null,
      createdAt: req.createdAt.toISOString(),
      updatedAt: req.updatedAt.toISOString(),
    }));

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching overtime requests:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}