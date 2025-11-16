import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";

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

    // Check if permissions are available
    if (!session.user.permissions) {
      return NextResponse.json(
        { error: "Permissions not configured" },
        { status: 403 }
      );
    }

    const { permissions } = session.user;

    // if (!permissions.summary.canRead) {
    //   return NextResponse.json(
    //     { error: "Forbidden: You don't have permission to view stores" },
    //     { status: 403 }
    //   );
    // }

    // If user has all store access, fetch all stores
    if (permissions.summary.allStoreAccess) {
      const stores = await db.store.findMany({
        select: {
          id: true,
          name: true,
        },
        orderBy: {
          name: "asc",
        },
      });

      return NextResponse.json({ stores }, { status: 200 });
    }

    // If user has limited access, fetch only their stores
    if (permissions.storeIds && permissions.storeIds.length > 0) {
      const stores = await db.store.findMany({
        select: {
          id: true,
          name: true,
        },
        where: {
          id: {
            in: permissions.storeIds,
          },
        },
        orderBy: {
          name: "asc",
        },
      });

      return NextResponse.json({ stores }, { status: 200 });
    }

    // Fallback: fetch user's assigned store if available
    if (session.user.storeId) {
      const stores = await db.store.findMany({
        select: {
          id: true,
          name: true,
        },
        where: {
          id: session.user.storeId,
        },
      });

      return NextResponse.json({ stores }, { status: 200 });
    }

    // No stores accessible
    return NextResponse.json({ stores: [] }, { status: 200 });
  } catch (error) {
    console.error("Error fetching stores:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
