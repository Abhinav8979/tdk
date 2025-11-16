export type Role =
  | "hr_coordinator"
  | "hr_coordinator_manager"
  | "store_director"
  | "general_manager"
  | "md"
  | "BASIC";

export type StoreScope = "ALL" | "SPECIFIED";

export interface RolePermissionConfig {
  role: Role;
  canRead: boolean;
  canWrite: boolean;
  storeScope: StoreScope;
  allowedStoreIds?: string[];
}

export const DEFAULT_ROLE_CONFIG: Record<Role, RolePermissionConfig> = {
  hr_coordinator: {
    role: "hr_coordinator",
    canRead: true,
    canWrite: true,
    storeScope: "SPECIFIED",
    allowedStoreIds: [],
  },

  hr_coordinator_manager: {
    role: "hr_coordinator_manager",
    canRead: true,
    canWrite: true,
    storeScope: "ALL",
  },

  store_director: {
    role: "store_director",
    canRead: true,
    canWrite: true,
    storeScope: "SPECIFIED",
    allowedStoreIds: [], // populate per user
  },

  general_manager: {
    role: "general_manager",
    canRead: true,
    canWrite: true,
    storeScope: "ALL",
  },

  md: {
    role: "md",
    canRead: true,
    canWrite: true,
    storeScope: "ALL",
  },
  BASIC: {
    role: "BASIC",
    canRead: true,
    canWrite: false,
    storeScope: "SPECIFIED",
    allowedStoreIds: [],
  },
};

/** User context */
export interface UserContext {
  userId: string;
  role: Role;
  storeIds?: string[];
}

export interface UserContextForPerm {
  userId: string;
  role: Role;
  storeIds?: string[];
}

/** getRoleConfig */
export function getRoleConfig(
  role: Role,
  overrideAllowedStoreIds?: string[]
): RolePermissionConfig {
  const base = DEFAULT_ROLE_CONFIG[role];
  if (!base) throw new Error(`Unknown role: ${role}`);
  return {
    ...base,
    allowedStoreIds:
      overrideAllowedStoreIds ?? base.allowedStoreIds ?? undefined,
  };
}

/** hasAllStoreAccess */
export function hasAllStoreAccess(role: Role): boolean {
  return DEFAULT_ROLE_CONFIG[role].storeScope === "ALL";
}

/** canAccessStore */
export function canAccessStore(
  user: UserContext,
  storeId: string,
  explicitAllowedStoreIds?: string[]
): boolean {
  const cfg = getRoleConfig(user.role, explicitAllowedStoreIds);
  if (cfg.storeScope === "ALL") return true;

  const allowed = new Set<string>([
    ...(cfg.allowedStoreIds ?? []),
    ...(user.storeIds ?? []),
  ]);

  return allowed.has(storeId);
}

/** canRead */
export function canRead(user: UserContext, storeId?: string): boolean {
  const cfg = DEFAULT_ROLE_CONFIG[user.role];
  if (!cfg.canRead) return false;
  if (!storeId) return true;
  return canAccessStore(user, storeId);
}

/** canWrite */
export function canWrite(user: UserContext, storeId?: string): boolean {
  const cfg = DEFAULT_ROLE_CONFIG[user.role];
  if (!cfg.canWrite) return false;
  if (!storeId) return true;
  return canAccessStore(user, storeId);
}

/** buildPermissionsSummary */
export function buildPermissionsSummary(user: UserContext, storeId?: string) {
  return {
    role: user.role,
    allStoreAccess: hasAllStoreAccess(user.role),
    canRead: canRead(user, storeId),
    canWrite: canWrite(user, storeId),
    storeChecked: storeId ?? null,
  };
}
