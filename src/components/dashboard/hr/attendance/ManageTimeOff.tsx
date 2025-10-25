"use client";

import React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import TimeThresholdModal from "@/components/modal/ManageTimeOff";
import ModalLayout from "@/layouts/ModalLayout";

const ManageTimeOff = ({ params }: { params: string | undefined }) => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleClick = () => {
    const currentParams = new URLSearchParams(searchParams.toString());
    currentParams.set("manageTimeOff", "true");
    router.push(`?${currentParams.toString()}`);
  };

  const handleClose = () => {
    router.back();
  };

  return (
    <div className="p-4">
      <button
        onClick={handleClick}
        className="bg-[#b4ca01] text-white px-2 py-1 md:px-4  rounded-lg border-none cursor-pointer mb-4"
      >
        Manage Timeoffs
      </button>

      {params && (
        <ModalLayout>
          <TimeThresholdModal onClose={handleClose} />
        </ModalLayout>
      )}
    </div>
  );
};

export default ManageTimeOff;
