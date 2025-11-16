"use client";

import AllStoreFilter from "@/components/AllStoreFilter";
import ManageExpenses from "@/components/dashboard/hr/expenses/ManageExpenses";
import { useGetAllStoreNames } from "@/hooks/RTKHooks";

import { useRouter } from "next/navigation";
import React, { useState } from "react";

const page = () => {
  const router = useRouter();

  const { data: allStoreNames } = useGetAllStoreNames(true);

  const [storeFilter, setStoreFilter] = useState<string>(
    allStoreNames!! ? allStoreNames[0].name : "Dehradun"
  );

  return (
    <div className="min-h-screen p-6 ">
      <div className=" mx-auto">
        {/* Main Content Section */}
        <div className="overflow-hidden">
          <div className="bg-lime-100 p-6 border-b-2 border-lime-400 flex justify-between items-center w-full">
            <h2 className="md:text-xl font-semibold text-stone-700">
              Expense Dashboard
            </h2>
            <div className="py-5">
              <AllStoreFilter
                stores={allStoreNames}
                selectedStore={storeFilter}
                onStoreChange={(e: any) => setStoreFilter(e.target.value)}
              />
            </div>
          </div>

          <div>
            <ManageExpenses storeName={storeFilter} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default page;
