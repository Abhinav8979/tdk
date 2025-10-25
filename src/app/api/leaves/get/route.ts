import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";
import { z } from "zod";
import { checkPermission } from "@/lib/permissions";

const querySchema = z
  .object({
    approvalStage: z.enum(["manager", "hr"]).optional(),
    status: z.enum(["pending", "approved", "rejected"]).optional(),
    employeeId: z.string().optional(),
    startDate: z.string().date().optional(),
    endDate: z.string().date().optional(),
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
    {
      message: "startDate must be before endDate",
    }
  );

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.userId as string;
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { profile: true, store: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const url = new URL(request.url);
    const queryParams = Object.fromEntries(url.searchParams);
    const parsed = querySchema.safeParse(queryParams);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: parsed.error.errors },
        { status: 400 }
      );
    }

    const {
      approvalStage,
      status,
      employeeId,
      startDate,
      endDate,
      limit,
      offset,
    } = parsed.data;
    const limitNum = limit ? parseInt(limit) : 100;
    const offsetNum = offset ? parseInt(offset) : 0;

    let where: any = {};
    if (status) where.status = status;
    if (approvalStage) where.approvalStage = approvalStage;
    if (employeeId) where.employeeId = employeeId;
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      where.startDate = { gte: start };
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.endDate = { lte: end };
    }

    const leaves = await db.leave.findMany({
      where,
      include: {
        Employee: { select: { username: true, userType: true } },
        ApprovedBy: { select: { username: true } },
      },
      orderBy: [{ createdAt: "desc" }],
      take: limitNum,
      skip: offsetNum,
    });

    const response = await Promise.all(
      leaves.map(async (leave) => {
        const manager = leave.manager
          ? await db.user.findUnique({
              where: { id: leave.manager },
              select: { empNo: true },
            })
          : null;

        return {
          leaveId: leave.leaveId,
          employeeId: leave.employeeId,
          employeeName: leave.Employee.username,
          startDate: leave.startDate.toISOString().split("T")[0],
          endDate: leave.endDate.toISOString().split("T")[0],
          isHalfDayStart: leave.isHalfDayStart,
          isHalfDayEnd: leave.isHalfDayEnd,
          startHalfPeriod: leave.startHalfPeriod,
          endHalfPeriod: leave.endHalfPeriod,
          reason: leave.reason,
          status: leave.status,
          manager: leave.manager,
          managerEmpNo: manager?.empNo || null,
          approvalStage: leave.approvalStage,
          managerApprovalStatus: leave.managerApprovalStatus,
          managerApprovedBy: leave.managerApprovedById
            ? (
                await db.user.findUnique({
                  where: { id: leave.managerApprovedById },
                })
              )?.username
            : null,
          managerApprovedAt: leave.managerApprovedAt?.toISOString(),
          hrApprovedBy: leave.ApprovedBy?.username,
          hrApprovedAt: leave.approvedAt?.toISOString(),
          effectiveDays: leave.effectiveDays,
          createdAt: leave.createdAt.toISOString(),
          updatedAt: leave.updatedAt.toISOString(),
        };
      })
    );

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}



// import { NextResponse } from "next/server";
// import { getServerSession } from "next-auth";
// import { authOptions } from "@/app/api/auth/[...nextauth]/route";
// import { db } from "@/lib/db";
// import { z } from "zod";
// import { checkPermission } from "@/lib/permissions";

// const querySchema = z
//   .object({
//     approvalStage: z.enum(["manager", "hr"]).optional(),
//     status: z.enum(["pending", "approved", "rejected"]).optional(),
//     employeeId: z.string().optional(),
//     startDate: z.string().date().optional(),
//     endDate: z.string().date().optional(),
//     limit: z.string().regex(/^\d+$/, "Limit must be a number").optional(),
//     offset: z.string().regex(/^\d+$/, "Offset must be a number").optional(),
//   })
//   .refine(
//     (data) => {
//       if (data.startDate && data.endDate) {
//         return new Date(data.startDate) <= new Date(data.endDate);
//       }
//       return true;
//     },
//     {
//       message: "startDate must be before endDate",
//     }
//   );

// export async function GET(request: Request) {
//   try {
//     const session = await getServerSession(authOptions);
//     if (!session || !session.user || !session.user.userId) {
//       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//     }

//     const userId = session.user.userId as string;
//     const user = await db.user.findUnique({
//       where: { id: userId },
//       select: { profile: true, store: true, role: true },
//     });

//     if (!user) {
//       return NextResponse.json({ error: "User not found" }, { status: 404 });
//     }

//     const url = new URL(request.url);
//     const queryParams = Object.fromEntries(url.searchParams);
//     const parsed = querySchema.safeParse(queryParams);
//     if (!parsed.success) {
//       return NextResponse.json(
//         { error: "Invalid query parameters", details: parsed.error.errors },
//         { status: 400 }
//       );
//     }

//     const {
//       approvalStage,
//       status,
//       employeeId,
//       startDate,
//       endDate,
//       limit,
//       offset,
//     } = parsed.data;
//     const limitNum = limit ? parseInt(limit) : 100;
//     const offsetNum = offset ? parseInt(offset) : 0;

//     let where: any = {};
//     if (status) where.status = status;
//     if (approvalStage) where.approvalStage = approvalStage;
//     if (employeeId) {
//       // Check permission for specific employeeId
//       const permission = await checkPermission(session, "VIEW_ATTENDANCE", {
//         targetUserId: employeeId,
//         storeBoundCheck:
//           user.profile === "hr_coordinator" ||
//           user.profile === "store_director",
//       });
//       if (!permission.isAuthorized) {
//         return NextResponse.json(
//           { error: permission.error },
//           { status: permission.status }
//         );
//       }
//       where.employeeId = employeeId;
//     }
//     if (startDate) where.startDate = { gte: new Date(startDate) };
//     if (endDate) where.endDate = { lte: new Date(endDate) };

//     const privilegedProfiles = [
//       "hr_coordinator",
//       "hr_coordinator_manager",
//       "store_director",
//       "md",
//     ];
//     const isPrivileged =
//       user.profile && privilegedProfiles.includes(user.profile);

//     if (user.role === "ADMIN") {
//       // Admins see all
//     } else if (isPrivileged) {
//       const permission = await checkPermission(session, "VIEW_ATTENDANCE", {
//         storeBoundCheck:
//           user.profile === "hr_coordinator" ||
//           user.profile === "store_director",
//       });
//       if (!permission.isAuthorized) {
//         return NextResponse.json(
//           { error: permission.error },
//           { status: permission.status }
//         );
//       }

//       if (
//         !user.store &&
//         (user.profile === "hr_coordinator" || user.profile === "store_director")
//       ) {
//         return NextResponse.json(
//           { error: "Forbidden: Not assigned to any store" },
//           { status: 403 }
//         );
//       }

//       where.Employee = { store: user.store };
//     } else {
//       // Check for own leaves or reports' leaves
//       const managedEmployees = await db.user.findMany({
//         where: { reportingManager: userId },
//         select: { id: true },
//       });
//       const allowedEmployeeIds = [...managedEmployees.map((e) => e.id), userId];

//       const ownPermission = await checkPermission(session, "VIEW_OWN_LEAVES", {
//         targetUserId: userId,
//       });
//       if (!ownPermission.isAuthorized) {
//         return NextResponse.json(
//           { error: ownPermission.error },
//           { status: ownPermission.status }
//         );
//       }

//       if (managedEmployees.length > 0) {
//         const reportsPermission = await checkPermission(
//           session,
//           "VIEW_REPORTS_LEAVES",
//           {
//             targetUserId: managedEmployees[0].id, // Check for at least one report
//           }
//         );
//         if (!reportsPermission.isAuthorized) {
//           return NextResponse.json(
//             { error: reportsPermission.error },
//             { status: reportsPermission.status }
//           );
//         }
//       }

//       where.employeeId = { in: allowedEmployeeIds };
//     }

//     const leaves = await db.leave.findMany({
//       where,
//       include: {
//         Employee: { select: { username: true, userType: true } },
//         ApprovedBy: { select: { username: true } },
//       },
//       orderBy: [{ createdAt: "desc" }],
//       take: limitNum,
//       skip: offsetNum,
//     });

//     const response = await Promise.all(
//       leaves.map(async (leave) => ({
//         leaveId: leave.leaveId,
//         employeeId: leave.employeeId,
//         employeeName: leave.Employee.username,
//         startDate: leave.startDate.toISOString().split("T")[0],
//         endDate: leave.endDate.toISOString().split("T")[0],
//         isHalfDayStart: leave.isHalfDayStart,
//         isHalfDayEnd: leave.isHalfDayEnd,
//         startHalfPeriod: leave.startHalfPeriod,
//         endHalfPeriod: leave.endHalfPeriod,
//         reason: leave.reason,
//         status: leave.status,
//         approvalStage: leave.approvalStage,
//         managerApprovalStatus: leave.managerApprovalStatus,
//         managerApprovedBy: leave.managerApprovedById
//           ? (
//               await db.user.findUnique({
//                 where: { id: leave.managerApprovedById },
//               })
//             )?.username
//           : null,
//         managerApprovedAt: leave.managerApprovedAt?.toISOString(),
//         hrApprovedBy: leave.ApprovedBy?.username,
//         hrApprovedAt: leave.approvedAt?.toISOString(),
//         effectiveDays: leave.effectiveDays,
//         createdAt: leave.createdAt.toISOString(),
//         updatedAt: leave.updatedAt.toISOString(),
//       }))
//     );

//     return NextResponse.json(response, { status: 200 });
//   } catch (error) {
//     console.error(error);
//     return NextResponse.json(
//       { error: "Internal server error" },
//       { status: 500 }
//     );
//   }
// }

