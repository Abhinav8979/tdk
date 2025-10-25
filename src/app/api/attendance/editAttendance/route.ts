import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";
import { z } from "zod";
import { checkPermission } from "@/lib/permissions";

interface EmployeeAttendance {
  employeeId: string;
  email: string;
  username: string;
  storeId?: string | null;
  storeName?: string | null;
  attendance: AttendanceResponse[];
}

interface AttendanceResponse {
  attendanceId?: string;
  date: string;
  status: string | null;
  inTime?: string | null;
  outTime?: string | null;
  isLateEntry?: boolean;
  isEarlyExit?: boolean;
  leaveType?: string | null;
  leavePeriod?: string | null;
  holidayName?: string | null;
  weekdayOff?: string | null;
  createdAt?: string;
  updatedAt?: string;
  lateEntryThreshold?: number;
  earlyExitThreshold?: number;
}

// Schema for request body validation
const bodySchema = z.object({
  status: z.enum(["present", "absent"]).optional(),
  inTime: z.string().datetime().optional().nullable(),
  outTime: z.string().datetime().optional().nullable(),
  isLateEntry: z.boolean().optional(),
  isEarlyExit: z.boolean().optional(),
});

// Schema for URL parameters
const paramsSchema = z.object({
  attendanceId: z.string(),
});

// Function to verify HR or store director's store association
async function verifyHrAndStore(userId: string, profile: string | null | undefined) {
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
    return { error: "Forbidden: User is not assigned to any store", status: 403 };
  }

  return { storeId: store.id, storeName: store.name };
}

export async function POST(request: Request, { params }: { params: { attendanceId: string } }) {
  try {
    // Get session
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.email || !session.user.userId) {
      return NextResponse.json(
        { error: "Unauthorized: No active session found" },
        { status: 401 }
      );
    }

    // Validate URL parameters
    const parsedParams = paramsSchema.safeParse(params);
    if (!parsedParams.success) {
      return NextResponse.json(
        { error: "Invalid attendance ID", details: parsedParams.error.errors },
        { status: 400 }
      );
    }

    const { attendanceId } = parsedParams.data;

    // Parse and validate request body
    const body = await request.json();
    const parsedBody = bodySchema.safeParse(body);
    if (!parsedBody.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsedBody.error.errors },
        { status: 400 }
      );
    }

    const { status, inTime, outTime, isLateEntry, isEarlyExit } = parsedBody.data;

    // Check if attendance record exists and fetch employee storeId
    const attendance = await db.attendance.findUnique({
        where: { attendanceId },
        select: {
          employeeId: true,
          date: true,
          Employee: {
            select: {
              storeId: true,
            },
          },
        },
      })

    if (!attendance) {
      return NextResponse.json(
        { error: "Attendance record not found" },
        { status: 404 }
      );
    }

    // Check permissions
    const privilegedProfiles = ["hr_coordinator", "store_director", "hr_coordinator_manager", "md"];
    const isPrivileged = session.user.profile && privilegedProfiles.includes(session.user.profile);

    if (!isPrivileged && attendance.employeeId !== session.user.userId) {
      return NextResponse.json(
        { error: "Forbidden: Can only edit own attendance" },
        { status: 403 }
      );
    }

    const permission = await checkPermission(session, "EDIT_ATTENDANCE", {
      storeBoundCheck: session.user.profile === "hr_coordinator" || session.user.profile === "store_director",
      targetUserId: attendance.employeeId,
    });
    if (!permission.isAuthorized) {
      return NextResponse.json(
        { error: permission.error },
        { status: permission.status }
      );
    }

    // Verify store association for hr_coordinator or store_director
    let hrStore: { storeId: string; storeName: string } | null = null;
    if (session.user.profile === "hr_coordinator" || session.user.profile === "store_director") {
      const verification = await verifyHrAndStore(session.user.userId, session.user.profile);
      if ("error" in verification) {
        return NextResponse.json(
          { error: verification.error },
          { status: verification.status }
        );
      }
      hrStore = verification;

      // Ensure the employee's storeId matches the user's store
      if (!attendance.Employee.storeId || attendance.Employee.storeId !== hrStore.storeId) {
        return NextResponse.json(
          { error: "Forbidden: Employee not in your store" },
          { status: 403 }
        );
      }
    }

    // Prepare update data
    const updateData: any = {};
    if (status !== undefined) updateData.status = status;
    if (inTime !== undefined) updateData.inTime = inTime ? new Date(inTime) : null;
    if (outTime !== undefined) updateData.outTime = outTime ? new Date(outTime) : null;
    if (isLateEntry !== undefined) updateData.isLateEntry = isLateEntry;
    if (isEarlyExit !== undefined) updateData.isEarlyExit = isEarlyExit;
    updateData.updatedAt = new Date();

    // Update attendance record
    const updatedAttendance = await db.attendance.update({
        where: { attendanceId },
        data: updateData,
        select: {
          attendanceId: true,
          date: true,
          status: true,
          inTime: true,
          outTime: true,
          isLateEntry: true,
          isEarlyExit: true,
          createdAt: true,
          updatedAt: true,
          Employee: {
            select: {
              id: true,
              email: true,
              username: true,
              storeId: true,
              store_info: { select: { name: true, lateEntryThreshold: true, earlyExitThreshold: true } },
            },
          },
        },
      })
    
    // Format response
    const response: EmployeeAttendance = {
      employeeId: updatedAttendance.Employee.id,
      email: updatedAttendance.Employee.email,
      username: updatedAttendance.Employee.username,
      storeId: updatedAttendance.Employee.storeId,
      storeName: updatedAttendance.Employee.store_info?.name || null,
      attendance: [
        {
          attendanceId: updatedAttendance.attendanceId,
          date: updatedAttendance.date.toISOString().split("T")[0],
          status: updatedAttendance.status,
          inTime: updatedAttendance.inTime?.toISOString() || null,
          outTime: updatedAttendance.outTime?.toISOString() || null,
          isLateEntry: updatedAttendance.isLateEntry,
          isEarlyExit: updatedAttendance.isEarlyExit,
          createdAt: updatedAttendance.createdAt.toISOString(),
          updatedAt: updatedAttendance.updatedAt?.toISOString(),
          lateEntryThreshold: updatedAttendance.Employee.store_info?.lateEntryThreshold || 10,
          earlyExitThreshold: updatedAttendance.Employee.store_info?.earlyExitThreshold || 10,
        },
      ],
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error editing attendance:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

