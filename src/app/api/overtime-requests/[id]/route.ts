import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";
import { z } from "zod";
import { checkPermission } from "@/lib/permissions";

const updateOvertimeRequestSchema = z
  .object({
    status: z.enum(["approved", "rejected"]),
    approvedHours: z
      .number()
      .nonnegative("Approved hours must be non-negative")
      .optional(),
  })
  .strict()
  .refine(
    (data) => {
      if (data.status === "approved" && data.approvedHours === undefined) {
        return false;
      }
      return true;
    },
    {
      message: "Approved hours are required for approval",
      path: ["approvedHours"],
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

    let isReportingManager = false;

    const overtimeRequest = await db.overtimeRequest.findUnique({
      where: { id: params.id },
      select: {
        employeeId: true,
        status: true,
        date: true,
      },
    });

    if (!overtimeRequest) {
      return NextResponse.json(
        { error: "Overtime request not found" },
        { status: 404 }
      );
    }

    if (overtimeRequest.status !== "pending") {
      return NextResponse.json(
        { error: "Request already approved or rejected" },
        { status: 400 }
      );
    }

    const employee = await db.user.findUnique({
      where: { id: overtimeRequest.employeeId },
      select: {
        store: true,
        reportingManager: true,
      },
    });

    if (!employee) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

    if (isPrivileged) {
      const permission = await checkPermission(session, "MANAGE_OVERTIME_REQUESTS", {
        storeBoundCheck: session.user.profile === "hr_coordinator" || session.user.profile === "store_director",
        targetUserId: overtimeRequest.employeeId,
      });
      if (!permission.isAuthorized) {
        return NextResponse.json(
          { error: permission.error },
          { status: permission.status }
        );
      }
    } else {
      // Check if user is the reporting manager
      if (employee.reportingManager !== session.user.userId) {
        return NextResponse.json(
          { error: "Forbidden: Not the employee's reporting manager" },
          { status: 403 }
        );
      }
      isReportingManager = true;
    }

    const body = await req.json();
    const parsed = updateOvertimeRequestSchema.safeParse(body.data.payload);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.errors },
        { status: 400 }
      );
    }

    const { status, approvedHours } = parsed.data;

    const updatedRequest = await db.$transaction(async (tx) => {
      const updated = await tx.overtimeRequest.update({
        where: { id: params.id },
        data: {
          status,
          approvedHours: status === "approved" ? approvedHours : null,
          approverId: session.user.userId,
          approvedAt: new Date(),
        },
      });

      if (status === "approved" && approvedHours) {
        const month = overtimeRequest.date.getMonth() + 1;
        const year = overtimeRequest.date.getFullYear();

        const salary = await tx.salary.findUnique({
          where: {
            employeeId_month_year: {
              employeeId: overtimeRequest.employeeId,
              month,
              year,
            },
          },
        });

        if (salary) {
          await tx.salary.update({
            where: { id: salary.id },
            data: {
              overtimeHours: {
                increment: approvedHours,
              },
              overtimePayable: {
                increment: approvedHours * salary.overtimeRate,
              },
              netSalary: {
                increment: approvedHours * salary.overtimeRate,
              },
              salaryGT: {
                increment: approvedHours * salary.overtimeRate,
              },
            },
          });
        }
      }

      // Notify employee
      // await tx.notification.create({
      //   data: {
      //     type: "overtime_request_update",
      //     message: `Your overtime request for ${
      //       overtimeRequest.date.toISOString().split("T")[0]
      //     } has been ${status}`,
      //     createdAt: new Date(),
      //     read: false,
      //     userId: overtimeRequest.employeeId,
      //   },
      // });

      return updated;
    });

    return NextResponse.json(updatedRequest);
  } catch (error) {
    console.error("Error updating overtime request:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}