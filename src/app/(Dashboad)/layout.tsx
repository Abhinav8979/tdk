import DashboardLayoutComp from "@/components/DashboardLayoutComp";
import PushMessageListener from "@/components/PushMessageListener";
import { ReactNode } from "react";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <PushMessageListener />
      <section
        style={{
          background: "var(--background-gradient)",
        }}
        className="sm:flex h-screen w-screen overflow-x-hidden  text-[var(--foreground)]"
      >
        <DashboardLayoutComp>{children}</DashboardLayoutComp>
      </section>
    </>
  );
}
