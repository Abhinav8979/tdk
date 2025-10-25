import { db } from "@/lib/db";
import { Session } from "next-auth";

// Define interface for permission configuration
interface PermissionConfig {
  allowedRoles: string[];
  allowedProfiles: string[];
  storeBoundProfiles: string[];
  restrictSelfUpdateProfiles?: string[];
}

// Define permission configurations
export const PERMISSIONS: Record<string, PermissionConfig> = {
  FETCH_ALL: {
    allowedRoles: ["BASIC","ADMIN","STOREMANAGER","SERVICE"],
    allowedProfiles: ["hr_coordinator", "hr_coordinator_manager", "store_director", "general_manager", "md"],
    storeBoundProfiles: ["hr_coordinator", "hr_coordinator_manager"],
  },
  UPDATE_USER: {
    allowedRoles: ["ADMIN"],
    allowedProfiles: ["hr_coordinator", "hr_coordinator_manager", "general_manager", "md", "store_director"],
    storeBoundProfiles: ["hr_coordinator", "hr_coordinator_manager"],
    restrictSelfUpdateProfiles: ["hr_coordinator", "hr_coordinator_manager"],
  },
  MANAGE_STORE_SETTINGS: {
    allowedRoles: [],
    allowedProfiles: ["hr_coordinator", "hr_coordinator_manager", "store_director", "md"],
    storeBoundProfiles: ["hr_coordinator", "store_director"],
    restrictSelfUpdateProfiles: [],
  },
  MANAGE_SALARIES: {
    allowedRoles: [],
    allowedProfiles: ["hr_coordinator", "hr_coordinator_manager", "store_director", "md"],
    storeBoundProfiles: ["hr_coordinator", "store_director"],
    restrictSelfUpdateProfiles: [],
  },
  SEND_PUSH_MESSAGES: {
    allowedRoles: [],
    allowedProfiles: ["hr_coordinator", "hr_coordinator_manager", "store_director", "md"],
    storeBoundProfiles: ["hr_coordinator", "store_director"],
    restrictSelfUpdateProfiles: [],
  },
  MANAGE_OVERTIME_REQUESTS: {
    allowedRoles: [],
    allowedProfiles: ["hr_coordinator", "hr_coordinator_manager", "store_director", "md"],
    storeBoundProfiles: ["hr_coordinator", "store_director"],
    restrictSelfUpdateProfiles: [],
  },
  MANAGE_EXPENSES: {
    allowedRoles: [],
    allowedProfiles: ["hr_coordinator", "hr_coordinator_manager", "store_director", "md"],
    storeBoundProfiles: ["hr_coordinator", "store_director"],
    restrictSelfUpdateProfiles: [],
  },
  VIEW_ATTENDANCE: {
    allowedRoles: ["BASIC","ADMIN","STOREMANAGER","SERVICE"],
    allowedProfiles: ["hr_coordinator", "hr_coordinator_manager", "store_director", "md"],
    storeBoundProfiles: ["hr_coordinator", "store_director"],
    restrictSelfUpdateProfiles: [],
  },
  MARK_ATTENDANCE: {
    allowedRoles: [],
    allowedProfiles: ["employee"],
    storeBoundProfiles: [],
    restrictSelfUpdateProfiles: [],
  },
  MANAGE_LEAVE_REQUESTS: {
    allowedRoles: ["ADMIN"],
    allowedProfiles: ["hr_coordinator", "hr_coordinator_manager", "store_director", "md"],
    storeBoundProfiles: ["hr_coordinator", "store_director"],
    restrictSelfUpdateProfiles: [],
  },
  WITHDRAW_LEAVE: {
    allowedRoles: ["BASIC","ADMIN","STOREMANAGER","SERVICE"],
    allowedProfiles: [],
    storeBoundProfiles: [],
    restrictSelfUpdateProfiles: [],
  },
  VIEW_OWN_LEAVES: {
    allowedRoles: ["BASIC","ADMIN","STOREMANAGER","SERVICE"],
    allowedProfiles: [],
    storeBoundProfiles: [],
    restrictSelfUpdateProfiles: [],
  },
  VIEW_REPORTS_LEAVES: {
    allowedRoles: ["BASIC","ADMIN","STOREMANAGER","SERVICE"],
    allowedProfiles: [],
    storeBoundProfiles: [],
    restrictSelfUpdateProfiles: [],
  },
  CREATE_LEAVE: {
    allowedRoles: ["BASIC","ADMIN","STOREMANAGER","SERVICE"],
    allowedProfiles: [],
    storeBoundProfiles: [],
    restrictSelfUpdateProfiles: [],
  },
  SYNC_USERS_STORES: {
    allowedRoles: ["ADMIN"],
    allowedProfiles: ["md"],
    storeBoundProfiles: [],
    restrictSelfUpdateProfiles: [],
  },
};

// Interface for permission check result
interface PermissionCheckResult {
  isAuthorized: boolean;
  error?: string;
  status: number;
}

// Permission check function
export async function checkPermission(
  session: Session | null,
  permissionType: keyof typeof PERMISSIONS,
  options: {
    targetUserId?: string;
    storeBoundCheck?: boolean;
    reportingManagerId?: string;
  } = {}
): Promise<PermissionCheckResult> {
  if (!session || !session.user || !session.user.email) {
    return {
      isAuthorized: false,
      error: "Unauthorized: No active session found",
      status: 401,
    };
  }

  const currentUser = await db.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, role: true, profile: true },
  });

  if (!currentUser) {
    return {
      isAuthorized: false,
      error: "User not found",
      status: 404,
    };
  }

  const config = PERMISSIONS[permissionType];
  let isAllowed =
    config.allowedRoles.includes(currentUser.role) ||
    (currentUser.profile && config.allowedProfiles.includes(currentUser.profile)) ||
    (permissionType === "MARK_ATTENDANCE" && !currentUser.profile) ||
    (permissionType === "WITHDRAW_LEAVE" && !currentUser.profile) ||
    (permissionType === "VIEW_OWN_LEAVES" && !currentUser.profile) ||
    (permissionType === "CREATE_LEAVE" && !currentUser.profile);

  // Special case for MANAGE_LEAVE_REQUESTS at manager stage
  if (permissionType === "MANAGE_LEAVE_REQUESTS" && options.reportingManagerId) {
    isAllowed = isAllowed || currentUser.id === options.reportingManagerId || currentUser.role === "ADMIN";
  }

  // Special case for VIEW_REPORTS_LEAVES
  if (permissionType === "VIEW_REPORTS_LEAVES" && options.targetUserId) {
    const targetUser = await db.user.findUnique({
      where: { id: options.targetUserId },
      select: { reportingManager: true },
    });
    isAllowed = targetUser?.reportingManager === currentUser.id || currentUser.role === "ADMIN";
  }

  // Ensure self-action for WITHDRAW_LEAVE and CREATE_LEAVE
  if ((permissionType === "WITHDRAW_LEAVE" || permissionType === "CREATE_LEAVE") && options.targetUserId && options.targetUserId !== currentUser.id) {
    return {
      isAuthorized: false,
      error: `Forbidden: Can only ${permissionType === "WITHDRAW_LEAVE" ? "withdraw" : "create"} your own leave`,
      status: 403,
    };
  }

  // Ensure self-view for VIEW_OWN_LEAVES
  if (permissionType === "VIEW_OWN_LEAVES" && options.targetUserId && options.targetUserId !== currentUser.id) {
    return {
      isAuthorized: false,
      error: "Forbidden: Can only view your own leaves",
      status: 403,
    };
  }

  if (!isAllowed) {
    return {
      isAuthorized: false,
      error: `Forbidden: Insufficient permissions for ${permissionType}`,
      status: 403,
    };
  }

  // Handle store-bound restrictions
  if (options.storeBoundCheck && currentUser.profile && config.storeBoundProfiles.includes(currentUser.profile)) {
    const hrStore = await db.store.findFirst({
      where: {
        OR: [
          { hrs: { some: { id: currentUser.id } } },
          { employees: { some: { id: currentUser.id } } },
        ],
      },
      select: { name: true },
    });

    if (!hrStore) {
      return {
        isAuthorized: false,
        error: "Forbidden: Not assigned to any store",
        status: 403,
      };
    }

    if (options.targetUserId) {
      const targetUser = await db.user.findUnique({
        where: { id: options.targetUserId },
        select: { store: true },
      });

      if (!targetUser) {
        return {
          isAuthorized: false,
          error: "Target user not found",
          status: 404,
        };
      }

      if (targetUser.store !== hrStore.name) {
        return {
          isAuthorized: false,
          error: "Forbidden: Can only perform actions on users in your own store",
          status: 403,
        };
      }
    }
  }

  // Check for self-update restrictions
  if (
    options.targetUserId &&
    options.targetUserId === currentUser.id &&
    currentUser.profile &&
    config.restrictSelfUpdateProfiles?.includes(currentUser.profile)
  ) {
    return {
      isAuthorized: false,
      error: "Forbidden: Cannot update your own data",
      status: 403,
    };
  }

  return { isAuthorized: true, status: 200 };
}