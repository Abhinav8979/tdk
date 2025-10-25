import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { db } from "@/lib/db";
import { z } from "zod";
import { checkPermission } from "@/lib/permissions";

const querySchema = z.object({
  employeeId: z.string(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
}).refine(
  (data) => {
    if (data.startDate && data.endDate) {
      return new Date(data.startDate) <= new Date(data.endDate);
    }
    return true;
  },
  { message: "startDate must be before endDate" }
);

interface EmployeeSummaryResponse {
  employeeId: string;
  name: string;
  address: string | null;
  totalAttendance: number;
  leaveHistory: {
    leaveId: string;
    startDate: string;
    endDate: string;
    effectiveDays: number;
    status: string;
    reason: string;
  }[];
  leavesLeft: number | null;
  totalExpenses: number;
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check permission for viewing employee summary
    const permissionCheck = await checkPermission(
      session,
      "FETCH_ALL",
      { 
        targetUserId: new URL(req.url).searchParams.get("employeeId") || undefined,
        storeBoundCheck: true
      }
    );

    if (!permissionCheck.isAuthorized) {
      return NextResponse.json(
        { error: permissionCheck.error },
        { status: permissionCheck.status }
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

    const { employeeId, startDate, endDate } = parsed.data;

    const employee = await db.user.findUnique({
      where: { id: employeeId },
      select: {
        id: true,
        username: true,
        address: true,
        leaveDays: true,
        store: true,
      },
    });

    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    const start = startDate ? new Date(startDate) : new Date(0);
    const end = endDate ? new Date(endDate) : new Date();

    // Fetch attendance, leave history, and expenses in parallel
    const [attendance, leaveHistory, expenses] = await Promise.all([
      db.attendance.count({
        where: {
          employeeId,
          date: { gte: start, lte: end },
          status: { notIn: ["absent", "leave"] },
        },
      }),
      db.leave.findMany({
        where: { 
          employeeId,
          startDate: { lte: end },
          endDate: { gte: start }
        },
        select: {
          leaveId: true,
          startDate: true,
          endDate: true,
          effectiveDays: true,
          status: true,
          reason: true,
        },
        orderBy: [{ startDate: "desc" }],
      }),
      db.expense.aggregate({
        where: {
          employeeId,
          date: { gte: start, lte: end },
        },
        _sum: { amount: true },
      }),
    ]);

    const response: EmployeeSummaryResponse = {
      employeeId: employee.id,
      name: employee.username,
      address: employee.address,
      totalAttendance: attendance,
      leaveHistory: leaveHistory.map((leave) => ({
        leaveId: leave.leaveId,
        startDate: leave.startDate.toISOString(),
        endDate: leave.endDate.toISOString(),
        effectiveDays: leave.effectiveDays,
        status: leave.status,
        reason: leave.reason,
      })),
      leavesLeft: employee.leaveDays,
      totalExpenses: expenses._sum.amount || 0,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching employee summary:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}