// types/next-auth.d.ts
import "next-auth";
import "next-auth/jwt";
import { Role, RolePermissionConfig } from "@/lib/permissions";

declare module "next-auth" {
  interface Session {
    user: {
      userId: string;
      email: string;
      username: string;
      profilePicture?: string | null;
      isHrPortalFirstLogin: boolean;
      userType: string;
      role: Role;
      referenceEmployee?: string | null;
      reportingManager?: string | null;
      empNo?: string | null;
      restricted: boolean;
      storeId?: string | null;
      store?: string | null;
      profile?: string | null;
      dept?: string | null;
      permissions?: {
        summary: {
          role: Role;
          allStoreAccess: boolean;
          canRead: boolean;
          canWrite: boolean;
          storeChecked: string | null;
        };
        storeIds: string[];
      };
    };
  }

  interface User {
    id: string;
    email: string;
    username: string;
    profilePicture?: string | null;
    isHrPortalFirstLogin: boolean;
    userType: string;
    role: Role;
    referenceEmployee?: string | null;
    reportingManager?: string | null;
    empNo?: string | null;
    restricted: boolean;
    storeId?: string | null;
    store?: string | null;
    profile?: string | null;
    dept?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId: string;
    email: string;
    username: string;
    profilePicture?: string | null;
    isHrPortalFirstLogin: boolean;
    userType: string;
    role: Role;
    referenceEmployee?: string | null;
    reportingManager?: string | null;
    empNo?: string | null;
    restricted: boolean;
    storeId?: string | null;
    store?: string | null;
    profile?: string | null;
    dept?: string | null;
  }
}
