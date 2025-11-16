import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";
import { checkPermission } from "@/lib/permissions";

export async function GET(request: Request) {
  try {
    // Get the user session
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.email) {
      return NextResponse.json(
        { error: "Unauthorized: No active session" },
        { status: 401 }
      );
    }

    // Check permissions for FETCH_ALL
    const permission = await checkPermission(session, "FETCH_ALL", {
      storeBoundCheck: true,
    });
    if (!permission.isAuthorized) {
      return NextResponse.json(
        { error: permission.error },
        { status: permission.status }
      );
    }

    // Fetch all stores with related data

    const stores = await db.store.findMany({
      select: {
        id: true,
        name: true,
        lateEntryThreshold: true,
        earlyExitThreshold: true,
        expectedInTime:true,
        expectedOutTime: true,
        createdAt: true,
        updatedAt: true,
        calendar: {
          select: {
            id: true,
            storeId: true,
            weekdayOff: true,
            createdAt: true,
            updatedAt: true,
            holidays: {
              select: {
                holidayId: true,
                date: true,
                name: true,
                description: true,
                createdAt: true,
                updatedAt: true,
              },
            },
          },
        },
        hrs: {
          select: {
            id: true,
            email: true,
            username: true,
            profile: true,
          },
        },
      },
    });

    // If user is hr_coordinator, filter stores to only their assigned store
    if (
      session.user.profile === "hr_coordinator" ||
      session.user.profile === "store_director"
    ) {
      const hrStore = await db.store.findFirst({
        where: {
          hrs: { some: { id: session.user.userId } },
        },
        select: { id: true },
      });

      if (!hrStore) {
        return NextResponse.json(
          { error: "Forbidden: Not assigned to any store" },
          { status: 403 }
        );
      }

      const filteredStores = stores.filter((store) => store.id === hrStore.id);
      return NextResponse.json({ stores: filteredStores }, { status: 200 });
    }

    // For md profile, return all stores
    return NextResponse.json({ stores }, { status: 200 });
  } catch (error) {
    console.error("Error fetching stores:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
