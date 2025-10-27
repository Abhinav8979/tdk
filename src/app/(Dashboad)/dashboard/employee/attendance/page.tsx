import React, { Suspense } from "react";
import Attendance from "@/components/dashboard/employee/attendance/Attendance";

const Page = () => {
  return (
    <div>
      <Suspense fallback={<div>Loading Attendance...</div>}>
        <Attendance />
      </Suspense>
    </div>
  );
};

export default Page;
