import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";
import { z } from "zod";
import { checkPermission } from "@/lib/permissions";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

// Validation schemas
const updateHolidaySchema = z
  .object({
    storeName: z
      .string()
      .min(1, "Store name is required")
      .optional(),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
      .optional(),
    name: z
      .string()
      .min(1, "Holiday name is required")
      .max(100, "Holiday name too long")
      .optional(),
    description: z
      .string()
      .max(500, "Description too long")
      .optional()
      .nullable(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 1, {
    message: "At least one field (besides storeName) must be provided for update",
  })
  .refine(
    (data) => data.storeName !== undefined,
    { message: "Store name is required for managing director", path: ["storeName"] }
  );

const storeNameSchema = z
  .object({
    storeName: z.string().min(1, "Store name is required"),
  })
  .strict();

// Common function to verify user and store ownership
async function verifyHrAndStore(userId: string, profile: string | null | undefined) {
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
    return { error: "Forbidden: User is not assigned to any store", status: 403 };
  }

  if (!store.calendar) {
    return { error: "Store has no associated calendar", status: 400 };
  }

  return { storeId: store.id, calendarId: store.calendar.id };
}

// GET: Fetch a specific holiday by ID
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.userId) {
      return NextResponse.json(
        { error: "Unauthorized: No active session" },
        { status: 401 }
      );
    }

    const holidayId = params.id;
    if (!holidayId) {
      return NextResponse.json(
        { error: "Bad Request: Holiday ID is required" },
        { status: 400 }
      );
    }

    // Check permissions
    const permission = await checkPermission(session, "MANAGE_STORE_SETTINGS", {
      storeBoundCheck: session.user.profile === "hr_coordinator" || session.user.profile === "store_director",
    });
    if (!permission.isAuthorized) {
      return NextResponse.json(
        { error: permission.error },
        { status: permission.status }
      );
    }

    let calendarId: string;
    if (session.user.profile === "hr_coordinator" || session.user.profile === "store_director") {
      const verification = await verifyHrAndStore(session.user.userId, session.user.profile);
      if ("error" in verification) {
        console.log(
          `[GET] Store-bound profile error: ${verification.error}, userId=${session.user.userId}, profile=${session.user.profile}`
        );
        return NextResponse.json(
          { error: verification.error },
          { status: verification.status }
        );
      }
      calendarId = verification.calendarId;
      console.log(
        `[GET] Store-bound profile: calendarId=${calendarId}, profile=${session.user.profile}`
      );
    } else {
      // For hr_coordinator_manager and md, use storeName from query params
      const { searchParams } = new URL(req.url);
      const storeName = searchParams.get("storeName");
      const parsed = storeNameSchema.safeParse({ storeName });
      if (!parsed.success) {
        console.log(
          `[GET] Invalid storeName: errors=${JSON.stringify(parsed.error.errors)}`
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
          `[GET] Error: Store not found for storeName=${parsed.data.storeName}, userId=${session.user.userId}, profile=${session.user.profile}`
        );
        return NextResponse.json(
          { error: "Store not found" },
          { status: 404 }
        );
      }
      if (!store.calendar) {
        console.log(
          `[GET] Error: Store has no associated calendar, storeName=${parsed.data.storeName}, storeId=${store.id}`
        );
        return NextResponse.json(
          { error: "Store has no associated calendar" },
          { status: 400 }
        );
      }
      calendarId = store.calendar.id;
      console.log(
        `[GET] Non-store-bound profile: storeName=${parsed.data.storeName}, calendarId=${calendarId}, profile=${session.user.profile}`
      );
    }

    const holiday = await db.holiday.findFirst({
      where: {
        holidayId,
        calendarId, // Ensure holiday belongs to the calendar
      },
      select: {
        holidayId: true,
        date: true,
        name: true,
        description: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!holiday) {
      console.log(
        `[GET] Holiday not found: holidayId=${holidayId}, calendarId=${calendarId}`
      );
      return NextResponse.json(
        { error: "Holiday not found or not in store calendar" },
        { status: 404 }
      );
    }

    console.log(`[GET] Fetched holiday: ${JSON.stringify(holiday)}`);
    return NextResponse.json(holiday, { status: 200 });
  } catch (error) {
    console.error(`[GET] Error fetching holiday: ${error}`);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT: Update a holiday
export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.userId) {
      return NextResponse.json(
        { error: "Unauthorized: No active session" },
        { status: 401 }
      );
    }

    const holidayId = params.id;
    if (!holidayId) {
      return NextResponse.json(
        { error: "Bad Request: Holiday ID is required" },
        { status: 400 }
      );
    }

    // Check permissions
    const permission = await checkPermission(session, "MANAGE_STORE_SETTINGS", {
      storeBoundCheck: session.user.profile === "hr_coordinator" || session.user.profile === "store_director",
    });
    if (!permission.isAuthorized) {
      return NextResponse.json(
        { error: permission.error },
        { status: permission.status }
      );
    }

    const body = await req.json();
    const parsed = updateHolidaySchema.safeParse(body);
    if (!parsed.success) {
      console.log(
        `[PUT] Invalid input: errors=${JSON.stringify(parsed.error.errors)}`
      );
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.errors },
        { status: 400 }
      );
    }

    let calendarId: string;
    if (session.user.profile === "hr_coordinator" || session.user.profile === "store_director") {
      const verification = await verifyHrAndStore(session.user.userId, session.user.profile);
      if ("error" in verification) {
        console.log(
          `[PUT] Store-bound profile error: ${verification.error}, userId=${session.user.userId}, profile=${session.user.profile}`
        );
        return NextResponse.json(
          { error: verification.error },
          { status: verification.status }
        );
      }
      calendarId = verification.calendarId;
      console.log(
        `[PUT] Store-bound profile: calendarId=${calendarId}, profile=${session.user.profile}`
      );
    } else {
      // For hr_coordinator_manager and md, use storeName from body
      const store = await db.store.findUnique({
        where: { name: parsed.data.storeName },
        select: { id: true, calendar: { select: { id: true } } },
      });
      if (!store) {
        console.log(
          `[PUT] Error: Store not found for storeName=${parsed.data.storeName}, userId=${session.user.userId}, profile=${session.user.profile}`
        );
        return NextResponse.json(
          { error: "Store not found" },
          { status: 404 }
        );
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
      calendarId = store.calendar.id;
      console.log(
        `[PUT] Non-store-bound profile: storeName=${parsed.data.storeName}, calendarId=${calendarId}, profile=${session.user.profile}`
      );
    }

    const { date, name, description } = parsed.data;
    if (date && new Date(date) <= new Date()) {
      console.log(`[PUT] Error: Attempted to set past date=${date}`);
      return NextResponse.json(
        { error: "Date cannot be in the past" },
        { status: 400 }
      );
    }

    console.log(
      `[PUT] Updating holidayId=${holidayId}, calendarId=${calendarId} with data=${JSON.stringify({ date, name, description })}`
    );
    const holiday = await db.holiday.update({
      where: {
        holidayId,
        calendarId, // Ensure holiday belongs to the calendar
      },
      data: {
        ...(date && { date: new Date(date) }),
        ...(name && { name }),
        ...(description !== undefined && { description }),
      },
      select: {
        holidayId: true,
        date: true,
        name: true,
        description: true,
        updatedAt: true,
      },
    });

    console.log(`[PUT] Updated holiday: ${JSON.stringify(holiday)}`);
    return NextResponse.json(holiday, { status: 200 });
  } catch (error) {
    console.error(`[PUT] Error updating holiday: ${error}`);
    if (
      error instanceof PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return NextResponse.json(
        { error: "Holiday not found or not in store calendar" },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE: Delete a holiday
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.userId) {
      return NextResponse.json(
        { error: "Unauthorized: No active session" },
        { status: 401 }
      );
    }

    const holidayId = params.id;
    if (!holidayId) {
      return NextResponse.json(
        { error: "Bad Request: Holiday ID is required" },
        { status: 400 }
      );
    }

    // Check permissions
    const permission = await checkPermission(session, "MANAGE_STORE_SETTINGS", {
      storeBoundCheck: session.user.profile === "hr_coordinator" || session.user.profile === "store_director",
    });
    if (!permission.isAuthorized) {
      return NextResponse.json(
        { error: permission.error },
        { status: permission.status }
      );
    }

    let calendarId: string;
    if (session.user.profile === "hr_coordinator" || session.user.profile === "store_director") {
      const verification = await verifyHrAndStore(session.user.userId, session.user.profile);
      if ("error" in verification) {
        console.log(
          `[DELETE] Store-bound profile error: ${verification.error}, userId=${session.user.userId}, profile=${session.user.profile}`
        );
        return NextResponse.json(
          { error: verification.error },
          { status: verification.status }
        );
      }
      calendarId = verification.calendarId;
      console.log(
        `[DELETE] Store-bound profile: calendarId=${calendarId}, profile=${session.user.profile}`
      );
    } else {
      // For hr_coordinator_manager and md, use storeName from query params
      const { searchParams } = new URL(req.url);
      const storeName = searchParams.get("storeName");
      const parsed = storeNameSchema.safeParse({ storeName });
      if (!parsed.success) {
        console.log(
          `[DELETE] Invalid storeName: errors=${JSON.stringify(parsed.error.errors)}`
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
          `[DELETE] Error: Store not found for storeName=${parsed.data.storeName}, userId=${session.user.userId}, profile=${session.user.profile}`
        );
        return NextResponse.json(
          { error: "Store not found" },
          { status: 404 }
        );
      }
      if (!store.calendar) {
        console.log(
          `[DELETE] Error: Store has no associated calendar, storeName=${parsed.data.storeName}, storeId=${store.id}`
        );
        return NextResponse.json(
          { error: "Store has no associated calendar" },
          { status: 400 }
        );
      }
      calendarId = store.calendar.id;
      console.log(
        `[DELETE] Non-store-bound profile: storeName=${parsed.data.storeName}, calendarId=${calendarId}, profile=${session.user.profile}`
      );
    }

    const holiday = await db.holiday.findUnique({
      where: { holidayId },
      select: { calendarId: true, date: true },
    });
    
    if (holiday && holiday.date < new Date()) {
      console.log(`[DELETE] Error: Attempted to delete past holiday, holidayId=${holidayId}`);
      return NextResponse.json(
        { error: "Cannot delete past holidays" },
        { status: 400 }
      );
    }

    console.log(`[DELETE] Deleting holidayId=${holidayId}, calendarId=${calendarId}`);
    await db.holiday.delete({
      where: {
        holidayId,
        calendarId, // Ensure holiday belongs to the calendar
      },
    });

    console.log(`[DELETE] Holiday deleted successfully: holidayId=${holidayId}`);
    return NextResponse.json(
      { message: "Holiday deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error(`[DELETE] Error deleting holiday: ${error}`);
    if (
      error instanceof PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return NextResponse.json(
        { error: "Holiday not found or not in store calendar" },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}