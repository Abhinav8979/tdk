"use client";

import AttendanceCalendar2 from "@/components/ui/calendar/Calendar";
import HrLeave from "@/components/dashboard/hr/leave/HrLeave";
import React from "react";
import { useRouter } from "next/navigation";
import { FaListAlt } from "react-icons/fa";
import { useSession } from "next-auth/react";

const Page = () => {
  const router = useRouter();
  const { data: session, status } = useSession();

  const handleViewRequests = () => {
    router.push("/dashboard/hr/leave-calendar/leave-requests");
  };

  // ✅ Loading state (important for production)
  if (status === "loading") {
    return (
      <section className="flex items-center justify-center h-screen">
        <p className="text-gray-600">Loading session...</p>
      </section>
    );
  }

  // ✅ Redirect or show message if user not logged in
  if (status === "unauthenticated") {
    return (
      <section className="flex items-center justify-center h-screen">
        <p className="text-gray-600">
          You must be logged in to view this page.
        </p>
      </section>
    );
  }

  // ✅ Safely extract storeName from session
  const storeName = session?.user?.store || "";

  return (
    <section className="max-w-7xl mx-auto px-6 py-8 space-y-8">
      {/* Header + Leave Management */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-2xl font-semibold text-gray-800">
          Leave Management
        </h1>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleViewRequests}
            className="flex items-center gap-2 px-4 py-2 cursor-pointer bg-lime-500 text-white rounded-lg hover:bg-lime-600 transition-colors font-medium"
          >
            <FaListAlt className="w-4 h-4" />
            View Leave Requests
          </button>
          <HrLeave />
        </div>
      </div>

      {/* Calendar Section */}
      <div>
        <h2 className="text-xl font-semibold text-gray-700 mb-4 text-center md:text-left">
          Leave Calendar
        </h2>

        {/* ✅ Pass storeName safely */}
        <AttendanceCalendar2 isEditable={true} storeName={storeName} />
      </div>
    </section>
  );
};

export default Page;
