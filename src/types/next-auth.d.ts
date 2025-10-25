import { Role, profile, dept} from "@prisma/client";

declare module "next-auth" {
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
    profile:profile|null;
    dept:dept|null;
  }

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
      profile:profile|null;
      dept:dept|null;
    };
    token: {
      userId: string;
      email: string;
      username: string;
      profilePicture?: string | null;
      isHrPortalFirstLogin: boolean;
      userType: string;
      userRole: Role;
      referenceEmployee?: string | null;
      reportingManager?: string | null;
      empNo?: string | null;
      restricted: boolean;
      storeId?: string | null;
      store?: string | null;
      exp?: number;
      profile:profile|null;
      dept:dept|null;
    };
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
    userRole: Role;
    referenceEmployee?: string | null;
    reportingManager?: string | null;
    empNo?: string | null;
    restricted: boolean;
    storeId?: string | null;
    store?: string | null;
    exp?: number;
    profile:profile|null;
    dept:dept|null;
  }
}

