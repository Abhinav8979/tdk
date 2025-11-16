"use client";

import AttendanceCalendar2 from "@/components/ui/calendar/Calendar";
import HrLeave from "@/components/dashboard/hr/leave/HrLeave";
import React, { Suspense, useState } from "react";
import { useRouter } from "next/navigation";
import { FaListAlt } from "react-icons/fa";
import AllStoreFilter from "@/components/AllStoreFilter";
import { useGetAllStoreNames } from "@/hooks/RTKHooks";

const Page = () => {
  const router = useRouter();

  const { data: allStoreNames } = useGetAllStoreNames(true);

  const [storeFilter, setStoreFilter] = useState<string>(
    allStoreNames!! ? allStoreNames[0].name : "Dehradun"
  );

  const handleViewRequests = () => {
    router.push("/dashboard/hr/leave-calendar/leave-requests");
  };

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
          <Suspense fallback={<div>Loading Leave...</div>}>
            <HrLeave />
          </Suspense>
        </div>
      </div>

      {/* Calendar Section */}
      <div>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
          {" "}
          <h2 className="text-xl font-semibold text-gray-700 mb-4 text-center md:text-left">
            Leave Calendar
          </h2>
          {/* ✅ Pass storeName safely */}
          <div className="py-5">
            <AllStoreFilter
              stores={allStoreNames}
              selectedStore={storeFilter}
              onStoreChange={(e: any) => setStoreFilter(e.target.value)}
            />
          </div>
        </div>

        <AttendanceCalendar2 isEditable={true} storeName={storeFilter} />
      </div>
    </section>
  );
};

export default Page;
