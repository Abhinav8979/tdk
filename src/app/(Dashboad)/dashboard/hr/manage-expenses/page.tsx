"use client";

import ManageExpenses from "@/components/dashboard/hr/expenses/ManageExpenses";
import Button from "@/components/ui/button/Button";

import { useRouter } from "next/navigation";
import React from "react";

const page = () => {
  const router = useRouter();

  const handleBackClick = () => {
    router.back();
  };

  return (
    <div className="min-h-screen p-6 ">
      <div className=" mx-auto">
        {/* Main Content Section */}
        <div className="overflow-hidden">
          <div className="bg-lime-100 p-6 border-b-2 border-lime-400">
            <h2 className="text-xl font-semibold text-stone-700">
              Expense Dashboard
            </h2>
          </div>

          <div>
            <ManageExpenses />
          </div>
        </div>
      </div>
    </div>
  );
};

export default page;
