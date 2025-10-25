"use client";

import ModalLayout from "@/layouts/ModalLayout";
import { usePathname, useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import LeaveForm from "../../employee/leave/leave props/LeaveForm";
import Button from "@/components/ui/button/Button";

const HrLeave = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleApplyLeave = () => {
    router.push(`${pathname}?apply-for-leave`);
    setIsModalOpen(true);
  };

  useEffect(() => {
    const applyForLeave = searchParams.get("apply-for-leave");
    if (applyForLeave !== null) {
      setIsModalOpen(true);
    } else {
      setIsModalOpen(false);
    }
  }, [searchParams]);
  return (
    <div>
      <Button onClick={handleApplyLeave} variant="outline">
        Apply for Leave
      </Button>

      {isModalOpen && (
        <ModalLayout>
          <LeaveForm />
        </ModalLayout>
      )}
    </div>
  );
};

export default HrLeave;
