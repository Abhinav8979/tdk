import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";

type AuthOptions = {
  adminOnly?: boolean; // Only ADMIN role
  adminOrHR?: boolean; // ADMIN, STOREMANAGER, or hr userType
  self?: { // Allow access to own data
    id?: string | ((req: Request) => string | undefined);
    email?: string | ((req: Request) => string | undefined);
    username?: string | ((req: Request) => string | undefined);
  };
  hrForStore?: { // HR can only edit users in their store
    userId: (req: Request) => string | undefined; // Extract user ID from request
  };
};

/**
 * Middleware to check authentication and authorization for API routes
 * @param handler The route handler function
 * @param options Authorization options (adminOnly, adminOrHR, self, hrForStore)
 * @returns NextResponse
 */
export function withAuth(handler: (req: Request) => Promise<NextResponse>, options: AuthOptions = {}) {
  return async (req: Request) => {
    try {
      // Check for active session
      const session = await getServerSession(authOptions);
      if (!session || !session.user || !session.user.email) {
        return NextResponse.json(
          { error: "Unauthorized: No active session found" },
          { status: 401 }
        );
      }

      // Fetch current user from database
      const currentUser = await db.user.findUnique({
        where: { email: session.user.email },
        select: { id: true, email: true, username: true, role: true, userType: true },
      });

      if (!currentUser) {
        return NextResponse.json(
          { error: "Unauthorized: User not found" },
          { status: 401 }
        );
      }

      // Admin-only check (ADMIN role)
      if (options.adminOnly && currentUser.role !== "ADMIN") {
        return NextResponse.json(
          { error: "Forbidden: Admin access required" },
          { status: 403 }
        );
      }

      // Admin or HR check (ADMIN, STOREMANAGER, or hr userType)
      if (
        options.adminOrHR &&
        !["ADMIN", "STOREMANAGER"].includes(currentUser.role) &&
        currentUser.userType !== "hr"
      ) {
        return NextResponse.json(
          { error: "Forbidden: Admin or HR access required" },
          { status: 403 }
        );
      }

      // Self check (accessing own data)
      if (options.self) {
        const selfId = typeof options.self.id === "function" ? options.self.id(req) : options.self.id;
        const selfEmail = typeof options.self.email === "function" ? options.self.email(req) : options.self.email;
        const selfUsername = typeof options.self.username === "function" ? options.self.username(req) : options.self.username;

        if (
          selfId !== currentUser.id &&
          selfEmail !== currentUser.email &&
          selfUsername !== currentUser.username
        ) {
          return NextResponse.json(
            { error: "Forbidden: You can only access your own data" },
            { status: 403 }
          );
        }
      }

      // HR store check (HR can only edit users in their store)
      if (options.hrForStore) {
        if (currentUser.userType !== "hr") {
          return NextResponse.json(
            { error: "Forbidden: Only HR users can perform this action" },
            { status: 403 }
          );
        }

        const targetUserId = options.hrForStore.userId(req);
        if (!targetUserId) {
          return NextResponse.json(
            { error: "Bad Request: User ID is required" },
            { status: 400 }
          );
        }

        // Prevent HR from editing themselves
        if (targetUserId === currentUser.id) {
          return NextResponse.json(
            { error: "Forbidden: HR cannot edit their own data" },
            { status: 403 }
          );
        }

        // Check if HR is assigned to a store and if the target user belongs to that store
        const hrStore = await db.store.findUnique({
          where: { hrId: currentUser.id },
          select: { id: true },
        });

        if (!hrStore) {
          return NextResponse.json(
            { error: "Forbidden: HR is not assigned to any store" },
            { status: 403 }
          );
        }

        const targetUser = await db.user.findUnique({
          where: { id: targetUserId },
          select: { storeId: true },
        });

        if (!targetUser) {
          return NextResponse.json(
            { error: "User not found" },
            { status: 404 }
          );
        }

        if (targetUser.storeId !== hrStore.id) {
          return NextResponse.json(
            { error: "Forbidden: HR can only edit users in their own store" },
            { status: 403 }
          );
        }
      }

      // Pass currentUser to the handler for further use
      (req as any).currentUser = currentUser;

      // Proceed to the route handler
      return await handler(req);
    } catch (error) {
      console.error("Auth middleware error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  };
}