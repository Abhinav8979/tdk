import React, { Suspense } from "react";
import EmployeeAttendance from "@/components/dashboard/employee/attendance/EmployeeAttendance";

const Page = () => {
  return (
    <div>
      <Suspense fallback={<div>Loading Attendance...</div>}>
        <EmployeeAttendance />
      </Suspense>
    </div>
  );
};

export default Page;
