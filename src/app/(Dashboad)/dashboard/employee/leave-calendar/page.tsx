import React, { Suspense } from "react";
import Leave from "@/components/dashboard/employee/leave/Leave";

const Page = () => {
  return (
    <section>
      <Suspense fallback={<div>Loading Leave...</div>}>
        <Leave />
      </Suspense>
    </section>
  );
};

export default Page;
