"use client";

import React, { ReactNode, useEffect, useState } from "react";
import Sidebar from "./dashboard/sidebar/Sidebar";
import TopBar from "./dashboard/topbar/TopBar";

const DashboardLayoutComp = ({ children }: { children: ReactNode }) => {
  const [collapse, setCollapse] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return; // ✅ prevent SSR issues

    const handleResize = () => {
      setCollapse(window.innerWidth <= 768); // collapse if mobile
    };

    handleResize(); // run once on mount

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <>
      <Sidebar setCollapse={setCollapse} collapse={collapse} />
      <div className="flex-1 flex flex-col">
        <TopBar setCollapse={setCollapse} />
        <main className="overflow-y-auto">{children}</main>
      </div>
    </>
  );
};

export default DashboardLayoutComp;
