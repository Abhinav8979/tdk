"use client";

import Button from "@/components/ui/button/Button";
import { SkeletonRow } from "@/components/ui/skeletonLoading/LeaveHistorytTableLoading";
import { useLeaveHistory, useWithdrawLeave } from "@/hooks/RTKHooks";
import React, { useState } from "react";
import { toast } from "react-toastify";

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case "approved":
      return "bg-green-100 text-green-800";
    case "pending":
      return "bg-yellow-100 text-yellow-800";
    case "rejected":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const LeaveHistoryTable = () => {
  const { data: leaveHistory, isPending, isError, refetch } = useLeaveHistory();
  const { mutate: withdrawLeave } = useWithdrawLeave();
  const [loadingLeaveId, setLoadingLeaveId] = useState<string | null>(null);

  if (isError) {
    toast.error("Something Went Wrong!");
  }

  const handleWithdraw = (leaveId: string) => {
    setLoadingLeaveId(leaveId);
    withdrawLeave(leaveId, {
      onError: () => setLoadingLeaveId(null),
      onSuccess: () => {
        setLoadingLeaveId(null);
        refetch();
      },
    });
  };

  return (
    <div className="shadow-md rounded-xl p-4 mt-6">
      <div className="overflow-x-auto">
        <h1 className="font-medium text-xl my-3 text-[var(--foreground)]">
          Leave History
        </h1>

        {isPending ? (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-center">
                <th className="p-3">Reason</th>
                <th className="p-3">Start Date</th>
                <th className="p-3">End Date</th>
                <th className="p-3">Status</th>
                <th className="p-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 5 }).map((_, index) => (
                <SkeletonRow key={index} />
              ))}
            </tbody>
          </table>
        ) : leaveHistory && leaveHistory.length > 0 ? (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-center">
                <th className="p-3">Reason</th>
                <th className="p-3">Start Date</th>
                <th className="p-3">End Date</th>
                <th className="p-3">Status</th>
                <th className="p-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {leaveHistory.map((leave, index) => (
                <tr key={index} className="border-t bg-white text-center">
                  <td className="p-3 text-[var(--foreground)]">
                    {leave.reason}
                  </td>
                  <td className="p-3 text-[var(--foreground)]">
                    {leave.startDate.split("T")[0]}
                  </td>
                  <td className="p-3 text-[var(--foreground)]">
                    {leave.endDate.split("T")[0]}
                  </td>
                  <td className="p-3">
                    <span
                      className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(
                        leave.status
                      )}`}
                    >
                      {leave.status}
                    </span>
                  </td>
                  <td className="p-3">
                    {leave.status.toLowerCase() === "pending" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        isLoading={loadingLeaveId === leave.leaveId}
                        onClick={() => handleWithdraw(leave.leaveId)}
                      >
                        Withdraw Request
                      </Button>
                    ) : (
                      <h1>Cannot take any action</h1>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500 text-lg">No leaves taken</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LeaveHistoryTable;
