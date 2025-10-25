"use client";

import { loginRoute, rootEmployeeRoute, rootHrRoute } from "@/lib/paths";
import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import React, { ReactNode, useEffect } from "react";
import { toast } from "react-toastify";

const ProtectedLayout = ({ children }: { children: ReactNode }) => {
  const session = useSession();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (pathname === "/") {
      router.push(loginRoute);
    }

    if (session.status === "authenticated") {
      const userType =
        session.data.user.userType === "hr"
          ? session.data.user.userType
          : "employee";
      if (pathname === loginRoute) {
        toast.warning("Please logout to login again!");
        router.push(userType === "hr" ? rootHrRoute : rootEmployeeRoute);
        return;
      }
      if (!pathname.includes(userType)) {
        toast.warning("You dont have the rights to access this page");
        router.push(loginRoute);
      }
    }
  }, [session.status, session.data]);

  if (session.status !== "authenticated") {
    return null;
  }

  return <>{children}</>;
};

export default ProtectedLayout;
