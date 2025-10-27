import EmployeeAttendanceTable from "@/components/dashboard/hr/attendance/EmployeeAttendance";
import ManageTimeOff from "@/components/dashboard/hr/attendance/ManageTimeOff";
import React, { Suspense } from "react";

interface PageProps {
  searchParams: Promise<{
    manageTimeOff?: string;
    [key: string]: string | undefined;
  }>;
}

const Page = async ({ searchParams }: PageProps) => {
  const params = await searchParams;
  const attendanceData = params.manageTimeOff;

  return (
    <main className="h-screen p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        {/* Header */}
        <header className="mb-2">
          <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900">
            HR Attendance Dashboard
          </h1>
          <p className="mt-1 text-sm sm:text-base text-gray-600">
            Manage employee attendance and time off requests efficiently.
          </p>
        </header>

        {/* Manage Time Off Section */}
        <section className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
          <h2 className="text-lg sm:text-xl font-medium text-gray-800">
            Manage Time Off
          </h2>
          <Suspense fallback={<div>Loading Leave...</div>}>
            <ManageTimeOff params={attendanceData} />
          </Suspense>
        </section>

        {/* Employee Attendance Table Section */}
        <section>
          <h2 className="text-lg sm:text-xl font-medium mb-3 sm:mb-4 text-gray-800">
            Employee Attendance
          </h2>
          <EmployeeAttendanceTable />
        </section>
      </div>
    </main>
  );
};

export default Page;
