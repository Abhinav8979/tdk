import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";
import { z } from "zod";
import { Prisma } from "@/generated/prisma";
import { checkPermission } from "@/lib/permissions";

// Validation schemas
const createHolidaySchema = z
  .object({
    storeName: z.string().min(1, "Store name is required").optional(),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
    name: z
      .string()
      .min(1, "Holiday name is required")
      .max(100, "Holiday name too long"),
    description: z
      .string()
      .max(500, "Description too long")
      .optional()
      .nullable(),
  })
  .strict()
  .refine((data) => data.storeName !== undefined, {
    message: "Store name is required for managing director",
    path: ["storeName"],
  });

const updateCalendarSchema = z
  .object({
    storeName: z.string().min(1, "Store name is required").optional(),
    weekdayOff: z.enum(
      [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ],
      {
        errorMap: () => ({
          message: "Weekday off must be a valid day of the week",
        }),
      }
    ),
  })
  .strict()
  .refine((data) => data.storeName !== undefined, {
    message: "Store name is required for managing director",
    path: ["storeName"],
  });

const updateTimesSchema = z
  .object({
    storeName: z.string().min(1, "Store name is required").optional(),
    expectedInTime: z
      .string()
      .regex(
        /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/,
        "Expected in time must be in HH:mm format"
      )
      .optional(),
    expectedOutTime: z
      .string()
      .regex(
        /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/,
        "Expected out time must be in HH:mm format"
      )
      .optional(),
    lateEntryThreshold: z
      .number()
      .int()
      .min(0, "Late entry threshold must be a non-negative integer")
      .optional(),
    earlyExitThreshold: z
      .number()
      .int()
      .min(0, "Early exit threshold must be a non-negative integer")
      .optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 1, {
    message:
      "At least one field (besides storeName) must be provided for update",
  })
  .refine((data) => data.storeName !== undefined, {
    message: "Store name is required for managing director",
    path: ["storeName"],
  });

async function verifyHrAndStore(
  userId: string,
  profile: string | null | undefined
) {
  const store = await db.store.findFirst({
    where: {
      OR: [
        { hrs: { some: { id: userId } } }, // For hr_coordinator
        { employees: { some: { id: userId } } }, // For store_director
      ],
    },
    select: { id: true, calendar: { select: { id: true } } },
  });

  if (!store) {
    return {
      error: "Forbidden: User is not assigned to any store",
      status: 403,
    };
  }

  if (!store.calendar) {
    return { error: "Store has no associated calendar", status: 400 };
  }

  return { storeId: store.id, calendarId: store.calendar.id };
}

// POST: Create a holiday
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.userId) {
      return NextResponse.json(
        { error: "Unauthorized: No active session" },
        { status: 401 }
      );
    }

    // Check permissions
    const permission = await checkPermission(session, "MANAGE_STORE_SETTINGS", {
      storeBoundCheck:
        session.user.profile === "hr_coordinator" ||
        session.user.profile === "store_director",
    });
    if (!permission.isAuthorized) {
      console.log(
        `[POST] Permission error: ${permission.error}, userId=${session.user.userId}, profile=${session.user.profile}`
      );
      return NextResponse.json(
        { error: permission.error },
        { status: permission.status }
      );
    }

    const body = await req.json();
    const parsed = createHolidaySchema.safeParse(body);
    if (!parsed.success) {
      console.log(
        `[POST] Invalid input: errors=${JSON.stringify(parsed.error.errors)}`
      );
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.errors },
        { status: 400 }
      );
    }

    const { date, name, description } = parsed.data;

    // Verify store assignment
    let calendarId: string;
    if (
      session.user.profile === "hr_coordinator" ||
      session.user.profile === "store_director"
    ) {
      const verification = await verifyHrAndStore(
        session.user.userId,
        session.user.profile
      );
      if ("error" in verification) {
        console.log(
          `[POST] Store-bound profile error: ${verification.error}, userId=${session.user.userId}, profile=${session.user.profile}`
        );
        return NextResponse.json(
          { error: verification.error },
          { status: verification.status }
        );
      }
      calendarId = verification.calendarId;
      console.log(
        `[POST] Store-bound profile: calendarId=${calendarId}, profile=${session.user.profile}`
      );
    } else {
      // For hr_coordinator_manager and md, use storeName from body
      const store = await db.store.findUnique({
        where: { name: parsed.data.storeName },
        select: { id: true, calendar: { select: { id: true } } },
      });

      if (!store) {
        console.log(
          `[POST] Error: Store not found for storeName=${parsed.data.storeName}, userId=${session.user.userId}, profile=${session.user.profile}`
        );
        return NextResponse.json({ error: "Store not found" }, { status: 404 });
      }

      if (!store.calendar) {
        console.log(
          `[POST] Error: Store has no associated calendar, storeName=${parsed.data.storeName}, storeId=${store.id}`
        );
        return NextResponse.json(
          { error: "Store has no associated calendar" },
          { status: 400 }
        );
      }

      calendarId = store.calendar.id;
      console.log(
        `[POST] Non-store-bound profile: storeName=${parsed.data.storeName}, calendarId=${calendarId}, profile=${session.user.profile}`
      );
    }

    console.log(
      `[POST] Creating holiday: date=${date}, name=${name}, description=${description}, calendarId=${calendarId}`
    );
    const holiday = await db.holiday.create({
      data: {
        date: new Date(date),
        name,
        description,
        calendarId,
      },
      select: {
        holidayId: true,
        date: true,
        name: true,
        description: true,
        createdAt: true,
      },
    });

    console.log(`[POST] Created holiday: ${JSON.stringify(holiday)}`);
    return NextResponse.json(holiday, { status: 201 });
  } catch (error) {
    console.error(`[POST] Error creating holiday: ${error}`);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT: Update calendar or employee times
export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.userId) {
      return NextResponse.json(
        { error: "Unauthorized: No active session" },
        { status: 401 }
      );
    }

    // Check permissions
    const permission = await checkPermission(session, "MANAGE_STORE_SETTINGS", {
      storeBoundCheck:
        session.user.profile === "hr_coordinator" ||
        session.user.profile === "store_director",
    });
    if (!permission.isAuthorized) {
      console.log(
        `[PUT] Permission error: ${permission.error}, userId=${session.user.userId}, profile=${session.user.profile}`
      );
      return NextResponse.json(
        { error: permission.error },
        { status: permission.status }
      );
    }

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");

    if (!action || !["calendar", "times"].includes(action)) {
      console.log(`[PUT] Invalid action: ${action}`);
      return NextResponse.json(
        { error: "Invalid action: Must be 'calendar' or 'times'" },
        { status: 400 }
      );
    }

    const body = await req.json();

    // Verify store assignment
    let storeId: string;
    let calendarId: string;
    if (
      session.user.profile === "hr_coordinator" ||
      session.user.profile === "store_director"
    ) {
      const verification = await verifyHrAndStore(
        session.user.userId,
        session.user.profile
      );
      if ("error" in verification) {
        console.log(
          `[PUT] Store-bound profile error: ${verification.error}, userId=${session.user.userId}, profile=${session.user.profile}`
        );
        return NextResponse.json(
          { error: verification.error },
          { status: verification.status }
        );
      }
      storeId = verification.storeId;
      calendarId = verification.calendarId;
      console.log(
        `[PUT] Store-bound profile: storeId=${storeId}, calendarId=${calendarId}, profile=${session.user.profile}`
      );
    } else {
      // For hr_coordinator_manager and md, use storeName from body
      const schema =
        action === "calendar" ? updateCalendarSchema : updateTimesSchema;
      const parsed = schema.safeParse(body.data);
      if (!parsed.success) {
        console.log(
          `[PUT] ${action} action: Invalid input, errors=${JSON.stringify(
            parsed.error.errors
          )}`
        );
        return NextResponse.json(
          { error: "Invalid input", details: parsed.error.errors },
          { status: 400 }
        );
      }

      const store = await db.store.findUnique({
        where: { name: parsed.data.storeName },
        select: { id: true, calendar: { select: { id: true } } },
      });

      if (!store) {
        console.log(
          `[PUT] Error: Store not found for storeName=${parsed.data.storeName}, userId=${session.user.userId}, profile=${session.user.profile}`
        );
        return NextResponse.json({ error: "Store not found" }, { status: 404 });
      }

      if (!store.calendar) {
        console.log(
          `[PUT] Error: Store has no associated calendar, storeName=${parsed.data.storeName}, storeId=${store.id}`
        );
        return NextResponse.json(
          { error: "Store has no associated calendar" },
          { status: 400 }
        );
      }

      storeId = store.id;
      calendarId = store.calendar.id;
      console.log(
        `[PUT] Non-store-bound profile: storeName=${parsed.data.storeName}, storeId=${storeId}, calendarId=${calendarId}, profile=${session.user.profile}`
      );
    }

    if (action === "calendar") {
      const parsed = updateCalendarSchema.safeParse(body.data);
      if (!parsed.success) {
        console.log(
          `[PUT] Calendar action: Invalid input, errors=${JSON.stringify(
            parsed.error.errors
          )}`
        );
        return NextResponse.json(
          { error: "Invalid input", details: parsed.error.errors },
          { status: 400 }
        );
      }

      const { weekdayOff } = parsed.data;
      console.log(
        `[PUT] Calendar action: Updating calendarId=${calendarId} with weekdayOff=${weekdayOff}`
      );

      const calendar = await db.calendar.update({
        where: { id: calendarId },
        data: { weekdayOff },
        select: {
          id: true,
          weekdayOff: true,
          updatedAt: true,
        },
      });

      console.log(
        `[PUT] Calendar action: Updated calendar=${JSON.stringify(calendar)}`
      );
      return NextResponse.json(calendar, { status: 200 });
    } else {
      const parsed = updateTimesSchema.safeParse(body.data);
      if (!parsed.success) {
        console.log(
          `[PUT] Times action: Invalid input, errors=${JSON.stringify(
            parsed.error.errors
          )}`
        );
        return NextResponse.json(
          { error: "Invalid input", details: parsed.error.errors },
          { status: 400 }
        );
      }

      const {
        expectedInTime,
        expectedOutTime,
        lateEntryThreshold,
        earlyExitThreshold,
      } = parsed.data;
      console.log(
        `[PUT] Times action: Input data - expectedInTime=${expectedInTime}, expectedOutTime=${expectedOutTime}, lateEntryThreshold=${lateEntryThreshold}, earlyExitThreshold=${earlyExitThreshold}`
      );

      // Update Store for thresholds and times
      const storeUpdateData: Prisma.StoreUpdateInput = {
        ...(expectedInTime && {
          expectedInTime: new Date(`1970-01-01T${expectedInTime}:00.000Z`),
        }),
        ...(expectedOutTime && {
          expectedOutTime: new Date(`1970-01-01T${expectedOutTime}:00.000Z`),
        }),
        ...(lateEntryThreshold !== undefined && { lateEntryThreshold }),
        ...(earlyExitThreshold !== undefined && { earlyExitThreshold }),
      };

      let store;
      if (
        expectedInTime ||
        expectedOutTime ||
        lateEntryThreshold !== undefined ||
        earlyExitThreshold !== undefined
      ) {
        console.log(
          `[PUT] Times action: Updating storeId=${storeId} with data=${JSON.stringify(
            storeUpdateData
          )}`
        );
        store = await db.store.update({
          where: { id: storeId },
          data: storeUpdateData,
          select: {
            id: true,
            lateEntryThreshold: true,
            earlyExitThreshold: true,
            expectedInTime: true,
            expectedOutTime: true,
            updatedAt: true,
          },
        });
        console.log(
          `[PUT] Times action: Updated store=${JSON.stringify(store)}`
        );
      } else {
        console.log(
          `[PUT] Times action: No store updates, fetching storeId=${storeId}`
        );
        store = await db.store.findUnique({
          where: { id: storeId },
          select: {
            id: true,
            lateEntryThreshold: true,
            earlyExitThreshold: true,
            expectedInTime: true,
            expectedOutTime: true,
            updatedAt: true,
          },
        });
      }

      // Update expectedInTime and expectedOutTime for all employees
      let updatedEmployees: Array<{
        id: string;
        username: string;
        expectedInTime: Date | null;
        expectedOutTime: Date | null;
        updatedAt: Date;
      }> = [];
      if (expectedInTime || expectedOutTime) {
        const userUpdateData: Prisma.UserUpdateInput = {
          ...(expectedInTime && {
            expectedInTime: new Date(`1970-01-01T${expectedInTime}:00.000Z`),
          }),
          ...(expectedOutTime && {
            expectedOutTime: new Date(`1970-01-01T${expectedOutTime}:00.000Z`),
          }),
        };
        console.log(
          `[PUT] Times action: Updating employees for storeId=${storeId} with data=${JSON.stringify(
            userUpdateData
          )}`
        );

        const updateResult = await db.user.updateMany({
          where: { storeId: storeId },
          data: userUpdateData,
        });
        console.log(
          `[PUT] Times action: Updated ${updateResult.count} employees`
        );

        // Fetch updated employees for response
        updatedEmployees = await db.user.findMany({
          where: { storeId: storeId },
          select: {
            id: true,
            username: true,
            expectedInTime: true,
            expectedOutTime: true,
            updatedAt: true,
          },
        });
        console.log(
          `[PUT] Times action: Fetched ${updatedEmployees.length} updated employees`
        );
      }

      return NextResponse.json(
        {
          store,
          updatedEmployees:
            updatedEmployees.length > 0 ? updatedEmployees : undefined,
        },
        { status: 200 }
      );
    }
  } catch (error) {
    console.error(`[PUT] Error updating store settings: ${error}`);
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return NextResponse.json(
        { error: "Store or calendar not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
