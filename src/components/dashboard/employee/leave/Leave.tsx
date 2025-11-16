"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react"; // <-- added
import Button from "@/components/ui/button/Button";
import ModalLayout from "@/layouts/ModalLayout";
import LeaveForm from "./leave props/LeaveForm";
import CustomToolbarCalendar from "@/components/ui/calendar/Calendar";
import LeaveHistoryTable from "./leave props/LeaveHistoryTable";

const Leave = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const { data: session, status } = useSession(); // <-- get session
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [view, setView] = useState<"toolbar" | "history">("toolbar");

  // derive storeName from session.user
  // adjust these keys to match your session's user shape
  const storeNameFromSession =
    (session as any)?.user?.store ?? (session as any)?.user?.storeName ?? " ";

  const handleApplyLeave = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("apply-for-leave", "true");
    router.push(`${pathname}?${params.toString()}`);
    setIsModalOpen(true);
  };

  const handleViewChange = (newView: "toolbar" | "history") => {
    setView(newView);
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", newView);
    if (newView === "toolbar") params.delete("view");
    router.push(`${pathname}?${params.toString()}`);
  };

  useEffect(() => {
    const applyForLeave = searchParams.get("apply-for-leave");
    const viewParam = searchParams.get("view");
    setIsModalOpen(applyForLeave === "true");
    setView(viewParam === "history" ? "history" : "toolbar");
  }, [searchParams]);

  return (
    <div className="min-h-screen p-4">
      <div className="mx-auto">
        <header className="flex justify-between items-center mb-6 p-4 bg-white rounded-lg shadow">
          <h1 className="text-2xl font-bold text-gray-800">Leave Management</h1>
          <Button
            onClick={handleApplyLeave}
            variant="primary"
            className="bg-[var(--primary-background)] text-white"
          >
            Apply for Leave
          </Button>
        </header>

        <div className="mb-6">{/* <AttendanceSummary /> */}</div>

        <div className="flex space-x-4 mb-6">
          <button
            onClick={() => handleViewChange("toolbar")}
            className={`md:px-4 md:py-2 p-2 rounded-md font-medium ${
              view === "toolbar"
                ? "bg-[var(--primary-background)] text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            Leave Calendar
          </button>
          <button
            onClick={() => handleViewChange("history")}
            className={`md:px-4 md:py-2 p-2 rounded-md font-medium ${
              view === "history"
                ? "bg-[var(--primary-background)] text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            Leave History
          </button>
        </div>

        {view === "toolbar" ? (
          <CustomToolbarCalendar
            storeName={storeNameFromSession} // <-- pass store from next-auth
            isEditable={false}
          />
        ) : (
          <LeaveHistoryTable />
        )}

        {isModalOpen && (
          <ModalLayout>
            <LeaveForm />
          </ModalLayout>
        )}
      </div>
    </div>
  );
};

export default Leave;
