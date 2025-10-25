"use client";

import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";

interface Providerprops {
  children: ReactNode;
}
function Provider({ children }: Providerprops) {
  return <SessionProvider>{children}</SessionProvider>;
}

export default Provider;
