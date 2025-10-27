"use client";

import { useGetEmployeeAttendance } from "@/hooks/RTKHooks";
import React, { useMemo } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import multiMonthPlugin from "@fullcalendar/multimonth";
import { EventSourceInput } from "@fullcalendar/core";

interface AttendanceRecord {
  attendanceId?: string;
  date: string;
  status: "present" | "absent";
  inTime?: string | null;
  outTime?: string | null;
  isLateEntry?: boolean;
  isEarlyExit?: boolean;
  createdAt?: string;
  updatedAt?: string | null;
  lateEntryThreshold?: number;
  earlyExitThreshold?: number;
}

const EmployeeAttendance: React.FC = () => {
  const params = useParams();
  const searchParams = useSearchParams();

  const employeeId = params?.id;
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const year = searchParams.get("year");
  const view = searchParams.get("view"); // 'month' or 'year'

  const { data, isLoading, isError } = useGetEmployeeAttendance({
    employeeId,
    startDate,
    endDate,
  });

  const router = useRouter();

  // Determine calendar view and date range
  const calendarConfig = useMemo(() => {
    const currentDate = new Date();
    let initialView = "dayGridMonth";
    let initialDate = currentDate;
    let validRange = undefined;

    if (view === "year" && year) {
      initialView = "multiMonthYear";
      initialDate = new Date(parseInt(year), 0, 1); // January 1st of the year
      validRange = {
        start: new Date(parseInt(year), 0, 1),
        end: new Date(parseInt(year) + 1, 0, 1), // January 1st of next year
      };
    } else if (view === "month" || (!view && startDate)) {
      initialView = "dayGridMonth";
      if (startDate) {
        initialDate = new Date(startDate);
        const start = new Date(startDate);
        const end = endDate
          ? new Date(endDate)
          : new Date(start.getFullYear(), start.getMonth() + 1, 0);
        validRange = {
          start,
          end: new Date(end.getTime() + 24 * 60 * 60 * 1000), // Add one day to include end date
        };
      }
    }

    return {
      initialView,
      initialDate,
      validRange,
    };
  }, [view, year, startDate, endDate]);

  // Transform attendance data into calendar events
  const calendarEvents: EventSourceInput = useMemo(() => {
    if (!data?.attendance) return [];

    return data.attendance.map((attendance: AttendanceRecord) => {
      const isPresent = attendance.status === "present";

      if (isPresent) {
        // Format times for display
        const inTime = attendance.inTime
          ? new Date(attendance.inTime).toLocaleTimeString("en-US", {
              hour12: true,
              hour: "2-digit",
              minute: "2-digit",
            })
          : "N/A";

        const outTime = attendance.outTime
          ? new Date(attendance.outTime).toLocaleTimeString("en-US", {
              hour12: true,
              hour: "2-digit",
              minute: "2-digit",
            })
          : "Not logged out";

        const title = `In: ${inTime} | Out: ${outTime}`;

        return {
          id: attendance.attendanceId || attendance.date,
          title,
          date: attendance.date,
          backgroundColor: attendance.isLateEntry
            ? "#fbbf24" // Yellow for late entry
            : attendance.isEarlyExit
            ? "#f97316" // Orange for early exit
            : "#10b981", // Green for normal attendance
          borderColor: attendance.isLateEntry
            ? "#f59e0b"
            : attendance.isEarlyExit
            ? "#ea580c"
            : "#059669",
          textColor: "#ffffff",
          extendedProps: {
            status: attendance.status,
            isLateEntry: attendance.isLateEntry || false,
            isEarlyExit: attendance.isEarlyExit || false,
            inTime: attendance.inTime,
            outTime: attendance.outTime,
          },
        };
      } else {
        // Absent day
        return {
          id: attendance.date,
          title: "Absent",
          date: attendance.date,
          backgroundColor: "#ef4444", // Red for absent
          borderColor: "#dc2626",
          textColor: "#ffffff",
          extendedProps: {
            status: attendance.status,
          },
        };
      }
    });
  }, [data?.attendance]);

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    if (!data?.attendance) {
      return {
        presentDays: 0,
        absentDays: 0,
        lateEntries: 0,
        earlyExits: 0,
      };
    }

    return {
      presentDays: data.attendance.filter(
        (a: AttendanceRecord) => a.status === "present"
      ).length,
      absentDays: data.attendance.filter(
        (a: AttendanceRecord) => a.status === "absent"
      ).length,
      lateEntries: data.attendance.filter(
        (a: AttendanceRecord) => a.isLateEntry
      ).length,
      earlyExits: data.attendance.filter((a: AttendanceRecord) => a.isEarlyExit)
        .length,
    };
  }, [data?.attendance]);

  // Early return for loading state - moved to after all hooks
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading attendance data...</div>
      </div>
    );
  }

  // Early return for error state - moved to after all hooks
  if (isError) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-red-600">
          Error loading attendance data
        </div>
      </div>
    );
  }

  const getHeaderTitle = (): string => {
    if (view === "year" && year) {
      return `Employee Attendance Calendar - Year ${year}`;
    } else if (view === "month" && startDate) {
      const date = new Date(startDate);
      return `Employee Attendance Calendar - ${date.toLocaleDateString(
        "en-US",
        { month: "long", year: "numeric" }
      )}`;
    }
    return "Employee Attendance Calendar";
  };

  const getDateRangeText = (): string => {
    if (view === "year" && year) {
      return `Year: ${year}`;
    }
    return `Period: ${startDate || "N/A"} to ${endDate || "N/A"}`;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Back Button */}
      <button
        onClick={() => router.back()}
        className="mb-4 flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors duration-200 font-medium"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 19l-7-7m0 0l7-7m-7 7h18"
          />
        </svg>
        Back
      </button>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {getHeaderTitle()}
        </h1>
        <div className="text-sm text-gray-600">{getDateRangeText()}</div>
      </div>

      {/* Legend */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-sm font-medium text-gray-900 mb-3">Legend:</h3>
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span>Present (Normal)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-500 rounded"></div>
            <span>Late Entry</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-orange-500 rounded"></div>
            <span>Early Exit</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500 rounded"></div>
            <span>Absent</span>
          </div>
        </div>
      </div>

      {/* Calendar */}
      <div className="bg-white rounded-lg shadow-sm border">
        <FullCalendar
          plugins={[dayGridPlugin, multiMonthPlugin]}
          initialView={calendarConfig.initialView}
          initialDate={calendarConfig.initialDate}
          validRange={calendarConfig.validRange}
          events={calendarEvents}
          height="auto"
          headerToolbar={{
            left: view === "year" ? "prev,next" : "prev,next today",
            center: "title",
            right: view === "year" ? "" : "dayGridMonth",
          }}
          dayMaxEvents={view === "year" ? 1 : 2}
          eventDisplay="block"
          eventTextColor="#ffffff"
          displayEventTime={false}
          fixedWeekCount={false}
          showNonCurrentDates={false}
          eventClassNames="cursor-pointer"
          dayCellClassNames="hover:bg-gray-50"
          // multiMonthMaxColumns={view === "year" ? 3 : 1}
          eventDidMount={(info) => {
            // Add hover effect
            info.el.style.cursor = "pointer";
            info.el.title = info.event.title;
          }}
        />
      </div>

      {/* Summary Stats */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <div className="text-2xl font-bold text-green-600">
            {summaryStats.presentDays}
          </div>
          <div className="text-sm text-green-800">Present Days</div>
        </div>
        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
          <div className="text-2xl font-bold text-red-600">
            {summaryStats.absentDays}
          </div>
          <div className="text-sm text-red-800">Absent Days</div>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
          <div className="text-2xl font-bold text-yellow-600">
            {summaryStats.lateEntries}
          </div>
          <div className="text-sm text-yellow-800">Late Entries</div>
        </div>
        <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
          <div className="text-2xl font-bold text-orange-600">
            {summaryStats.earlyExits}
          </div>
          <div className="text-sm text-orange-800">Early Exits</div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeAttendance;
