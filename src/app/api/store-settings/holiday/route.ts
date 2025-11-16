import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";
import { checkPermission } from "@/lib/permissions";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    // Check permission for viewing holidays
    const permissionCheck = await checkPermission(
      session,
      "FETCH_ALL", // Using the same permission as it's about viewing data
      { storeBoundCheck: true } // Enforce store-bound restrictions
    );

    if (!permissionCheck.isAuthorized) {
      return NextResponse.json(
        { error: permissionCheck.error },
        { status: permissionCheck.status }
      );
    }

    const currentUser = await db.user.findUnique({
      where: { email: session?.user?.email || "" },
      select: {
        id: true,
        store: true,
        profile: true,
      },
    });

    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // For profiles with store access but not bound to a specific store (like hr_coordinator_manager)
    let storeName;
    const url = new URL(req.url);
    const storeParam = url.searchParams.get("store");
    console.log("Reached", storeParam);
    if (storeParam) {
      storeName = storeParam;
    } else {
      return NextResponse.json(
        { error: "Store parameter is required for this profile" },
        { status: 400 }
      );
    }
    console.log(storeName);
    // if (!storeName && currentUser.profile === "hr_coordinator_manager") {
    //   // If manager wants to view all holidays, they need to specify a store in query params

    //      const url = new URL(req.url);
    //   const storeParam = url.searchParams.get("store");
    //   console.log("Reached", storeParam);
    //   if (storeParam) {
    //     storeName = storeParam;
    //   } else {
    //     return NextResponse.json(
    //       { error: "Store parameter is required for this profile" },
    //       { status: 400 }
    //     );
    //   }
    // }

    if (!storeName) {
      return NextResponse.json(
        { error: "User is not assigned to any store" },
        { status: 400 }
      );
    }

    const store = await db.store.findUnique({
      where: { name: storeName },
      select: {
        id: true,
        calendar: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!store) {
      return NextResponse.json(
        { error: `Store '${storeName}' not found` },
        { status: 404 }
      );
    }

    if (!store.calendar) {
      return NextResponse.json(
        { error: "Store has no associated calendar" },
        { status: 400 }
      );
    }

    const holidays = await db.holiday.findMany({
      where: { calendarId: store.calendar.id },
      select: {
        holidayId: true,
        date: true,
        name: true,
        description: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { date: "asc" },
    });

    const structuredHolidays = holidays.map((item) => ({
      id: item.holidayId,
      title: item.name,
      start: new Date(item.date),
      end: new Date(item.date),
      reason: item.description,
    }));

    return NextResponse.json(structuredHolidays, { status: 200 });
  } catch (error) {
    console.error("Error fetching holidays:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
