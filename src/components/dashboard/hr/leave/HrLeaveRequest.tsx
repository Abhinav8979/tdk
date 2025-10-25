"use client";

import Button from "@/components/ui/button/Button";
import { useApproveLeaveStatus, useGetLeaves } from "@/hooks/RTKHooks";
import { useRouter } from "next/navigation";
import React, { useMemo, useState } from "react";
import {
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaUser,
  FaCalendarAlt,
  FaFilter,
} from "react-icons/fa";
import { isSameDay, isSameWeek, isSameMonth, parseISO } from "date-fns";
import { toast } from "react-toastify";
import { LeaveRecord } from "@/types/employeeDashboard.types";
import LeaveRequestSkeleton from "@/components/skeleton/Hr/leave request/LeaveRequestSkeleton";

type StatusFilter = "all" | "pending" | "approved" | "rejected";
type DateView = "all" | "day" | "week" | "month";

const LeaveRequests: React.FC = () => {
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [dateView, setDateView] = useState<DateView>("all");

  const router = useRouter();
  const { data, isLoading, refetch } = useGetLeaves();
  const { mutate: approveLeaves, isPending } = useApproveLeaveStatus();

  const handleApprove = (leaveId: string) => {
    approveLeaves(
      { leaveId, status: "approved", remark: "Approved by manager" },
      {
        onSuccess: () => {
          toast.success("Leave Approved!!");
          refetch();
        },
        onError: () => toast.error("Approval Failed!"),
      }
    );
  };

  const handleReject = (leaveId: string) => {
    approveLeaves(
      { leaveId, status: "rejected", remark: "Rejected by manager" },
      {
        onSuccess: () => {
          toast.success("Leave Request Rejected!!");
          refetch();
        },
        onError: () => toast.error("Rejection Failed!"),
      }
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <FaCheckCircle className="w-5 h-5 text-[var(--primary-background)]" />
        );
      case "rejected":
        return <FaTimesCircle className="w-5 h-5 text-red-500" />;
      default:
        return <FaClock className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-[var(--secondary-background)] text-[var(--foreground)]";
      case "rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-yellow-100 text-yellow-800";
    }
  };

  const filteredRequests = useMemo(() => {
    const today = new Date();
    return data?.filter((req: LeaveRecord) => {
      if (filter !== "all" && req.status !== filter) return false;

      const appliedDate = parseISO(req.startDate);
      if (dateView === "day" && !isSameDay(appliedDate, today)) return false;
      if (
        dateView === "week" &&
        !isSameWeek(appliedDate, today, { weekStartsOn: 1 })
      )
        return false;
      if (dateView === "month" && !isSameMonth(appliedDate, today))
        return false;

      return true;
    });
  }, [data, filter, dateView]);

  if (isLoading) return <LeaveRequestSkeleton />;

  return (
    <div className="space-y-6 bg-[var(--tertiary-background)] min-h-screen p-6 text-[var(--foreground)]">
      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 flex-wrap">
        {/* Left Side (Back + Filters) */}
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* Back Button */}
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="w-full xs:w-auto"
          >
            ← Back
          </Button>

          {/* Status Filter */}
          <div className="flex items-center gap-2 w-full xs:w-auto">
            <FaFilter className="w-5 h-5 text-[var(--foreground)]" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as StatusFilter)}
              className="flex-1 sm:flex-none px-3 py-2 border border-[var(--foreground)] rounded-lg focus:ring-2 focus:ring-[var(--secondary-background)] bg-[var(--secondary-background)] text-[var(--foreground)] text-sm"
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          {/* Date View Filter */}
          <div className="flex items-center gap-2 w-full xs:w-auto">
            <FaCalendarAlt className="w-5 h-5 text-[var(--foreground)]" />
            <select
              value={dateView}
              onChange={(e) => setDateView(e.target.value as DateView)}
              className="flex-1 sm:flex-none px-3 py-2 border border-[var(--foreground)] rounded-lg focus:ring-2 focus:ring-[var(--primary-background)] bg-[var(--secondary-background)] text-[var(--foreground)] text-sm"
            >
              <option value="all">All Time</option>
              <option value="day">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
          </div>
        </div>

        {/* Right Side (Total count) */}
        <div className="text-sm text-[var(--foreground)] text-center sm:text-right w-full sm:w-auto">
          Total: {filteredRequests.length} requests
        </div>
      </div>

      {/* Requests List */}
      <div className="grid gap-4">
        {filteredRequests.map((request: LeaveRecord) => (
          <div
            key={request.leaveId}
            className="bg-[var(--secondary-background)] border border-[var(--foreground)]/20 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
              {/* Employee Info */}
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-3">
                  <FaUser className="w-5 h-5 text-[var(--foreground)]" />
                  <div>
                    <h3 className="font-semibold text-[var(--foreground)]">
                      {request.employeeName}
                    </h3>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <strong>Duration:</strong>{" "}
                    {request.isHalfDayEnd || request.isHalfDayStart
                      ? request.effectiveDays - 0.5
                      : request.effectiveDays}{" "}
                    days
                  </div>
                  <div>
                    <strong>From:</strong>{" "}
                    {new Date(request.startDate).toLocaleDateString()}
                  </div>
                  <div>
                    <strong>To:</strong>{" "}
                    {new Date(request.endDate).toLocaleDateString()}
                  </div>
                </div>

                <div className="text-sm">
                  <strong>Reason:</strong> {request.reason}
                </div>
              </div>

              {/* Status & Actions */}
              <div className="flex flex-col items-end gap-3">
                <div className="flex items-center gap-2">
                  {getStatusIcon(request.status)}
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                      request.status
                    )}`}
                  >
                    {request.status.charAt(0).toUpperCase() +
                      request.status.slice(1)}
                  </span>
                </div>

                {request.status === "pending" && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApprove(request.leaveId)}
                      className="px-4 py-2 cursor-pointer bg-[var(--primary-background)] text-white rounded-lg hover:opacity-90 text-sm"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleReject(request.leaveId)}
                      className="px-4 py-2 cursor-pointer bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredRequests.length === 0 && (
        <div className="text-center py-12">
          <FaClock className="w-12 h-12 text-[var(--foreground)]/50 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-[var(--foreground)] mb-2">
            No requests found
          </h3>
          <p className="text-[var(--foreground)]/70">
            {filter === "all"
              ? "No leave requests to display"
              : `No ${filter} requests found`}
          </p>
        </div>
      )}
    </div>
  );
};

export default LeaveRequests;
