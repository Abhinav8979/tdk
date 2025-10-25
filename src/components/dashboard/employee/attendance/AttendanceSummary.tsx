"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { MdTrendingUp, MdCalendarToday } from "react-icons/md";
import { useGetEmployeeAttendanceSummary } from "@/hooks/RTKHooks";

interface AttendanceSummaryAPI {
  employeeId: string;
  fromDate: string;
  toDate: string;
  totalWorkingDays: number;
  daysPresent: number;
  attendancePercentage: number;
}

interface AttendanceSummaryProps {
  employeeId?: string;
  className?: string;
  showHeader?: boolean;
}

const AttendanceSummary: React.FC<AttendanceSummaryProps> = ({
  employeeId,
  className = "",
  showHeader = true,
}) => {
  const session = useSession();
  const [id, setId] = useState<string | null | undefined>(employeeId);

  const { data: summaryData, isPending: summaryPending } =
    useGetEmployeeAttendanceSummary({
      id: id,
    });

  useEffect(() => {
    if (
      !employeeId &&
      session.status === "authenticated" &&
      session.data?.user
    ) {
      setId(session.data.user.userId);
    } else if (employeeId) {
      setId(employeeId);
    }
  }, [session.status, session.data, employeeId]);

  if (session.status !== "authenticated" && !employeeId) {
    return null;
  }

  if (summaryPending) {
    return (
      <div
        className={`bg-[var(--secondary-background)] rounded-lg shadow-sm border border-[var(--foreground)]/10 p-6 ${className}`}
      >
        <div className="animate-pulse">
          {showHeader && (
            <div className="flex items-center gap-3 mb-4">
              <div className="w-6 h-6 bg-[var(--tertiary-background)] rounded"></div>
              <div className="h-6 bg-[var(--tertiary-background)] rounded w-48"></div>
            </div>
          )}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="text-center">
                <div className="h-8 bg-[var(--tertiary-background)] rounded mb-2"></div>
                <div className="h-4 bg-[var(--tertiary-background)] rounded"></div>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <div className="h-4 bg-[var(--tertiary-background)] rounded"></div>
            <div className="h-3 bg-[var(--tertiary-background)] rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  const apiSummary: AttendanceSummaryAPI | null = summaryData || null;

  if (!apiSummary) {
    return (
      <div
        className={`bg-[var(--secondary-background)] rounded-lg shadow-sm border border-[var(--foreground)]/10 p-6 ${className}`}
      >
        <div className="text-center text-[var(--foreground)]/60">
          <MdCalendarToday className="w-12 h-12 mx-auto mb-2 text-[var(--tertiary-background)]" />
          <p>No attendance summary available</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-lg shadow-sm border border-[var(--foreground)]/10 p-6 ${className}`}
    >
      {showHeader && (
        <div className="flex items-center gap-3 mb-4">
          <MdTrendingUp className="w-6 h-6 text-[var(--primary-background)]" />
          <h3 className="text-lg font-semibold text-[var(--foreground)]">
            Attendance Summary
          </h3>
        </div>
      )}

      {/* Summary Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="text-center bg-[var(--secondary-background)] rounded-lg p-4">
          <div className="text-2xl font-bold text-[var(--primary-background)]">
            {apiSummary.totalWorkingDays}
          </div>
          <div className="text-sm text-[var(--foreground)]">
            Total Working Days
          </div>
        </div>
        <div className="text-center bg-[var(--secondary-background)] rounded-lg p-4">
          <div className="text-2xl font-bold text-[var(--primary-background)]">
            {apiSummary.daysPresent}
          </div>
          <div className="text-sm text-[var(--foreground)]">Days Present</div>
        </div>
        <div className="text-center bg-[var(--secondary-background)] rounded-lg p-4">
          <div className="text-2xl font-bold text-[var(--primary-background)]">
            {apiSummary.attendancePercentage.toFixed(1)}%
          </div>
          <div className="text-sm text-[var(--foreground)]">
            Attendance Rate
          </div>
        </div>
        <div className="text-center bg-[var(--secondary-background)] rounded-lg p-4">
          <div className="text-xs text-[var(--foreground)]/60 mb-1">Period</div>
          <div className="text-sm font-medium text-[var(--foreground)]">
            {new Date(apiSummary.fromDate).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}{" "}
            -{" "}
            {new Date(apiSummary.toDate).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </div>
        </div>
      </div>

      {/* Attendance Percentage Bar */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-[var(--foreground)]">
            Attendance Progress
          </span>
          <span className="text-sm font-bold text-[var(--primary-background)]">
            {apiSummary.attendancePercentage.toFixed(1)}%
          </span>
        </div>
        <div className="w-full bg-[var(--secondary-background)] rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all duration-500 ${
              apiSummary.attendancePercentage >= 90
                ? "bg-[var(--primary-background)]"
                : apiSummary.attendancePercentage >= 75
                ? "bg-[#d4e157]" // Slightly darker shade of secondary for medium attendance
                : "bg-[#b44a01]" // Complementary red-orange for low attendance
            }`}
            style={{
              width: `${Math.min(apiSummary.attendancePercentage, 100)}%`,
            }}
          ></div>
        </div>

        {/* Performance Indicator */}
        <div className="mt-2 text-center">
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              apiSummary.attendancePercentage >= 90
                ? "bg-[var(--primary-background)]/20 text-[var(--primary-background)]"
                : apiSummary.attendancePercentage >= 75
                ? "bg-[#d4e157]/20 text-[#d4e157]"
                : "bg-[#b44a01]/20 text-[#b44a01]"
            }`}
          >
            {apiSummary.attendancePercentage >= 90
              ? "Excellent"
              : apiSummary.attendancePercentage >= 75
              ? "Good"
              : "Needs Improvement"}
          </span>
        </div>
      </div>

      {/* Additional Metrics */}
      <div className="mt-4 pt-4 border-t border-[var(--foreground)]/10">
        <div className="flex justify-between items-center text-sm">
          <span className="text-[var(--foreground)]/60">Days Absent:</span>
          <span className="font-semibold text-[#b44a01]">
            {apiSummary.totalWorkingDays - apiSummary.daysPresent}
          </span>
        </div>
      </div>
    </div>
  );
};

export default AttendanceSummary;
