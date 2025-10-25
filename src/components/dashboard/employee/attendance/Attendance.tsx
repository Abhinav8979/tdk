"use client";

import AttendanceSkeleton from "@/components/skeleton/employee/attendance/AttendanceSkeleton";
import {
  useGetEmployeeAttendance,
  useGetEmployeeAttendanceSummary,
} from "@/hooks/RTKHooks";
import { useSession } from "next-auth/react";
import React, { useEffect, useState } from "react";
import {
  MdChevronLeft,
  MdChevronRight,
  MdCalendarToday,
  MdAccessTime,
  MdCheckCircle,
  MdCancel,
  MdRemoveCircle,
} from "react-icons/md";
import AttendanceSummary from "./AttendanceSummary";

// Updated interface to match your API response
interface AttendanceRecord {
  attendanceId?: string;
  date: string;
  status: "present" | "absent" | "holiday" | "weekdayoff";
  inTime?: string | null;
  outTime?: string | null;
  isLateEntry: boolean;
  isEarlyExit: boolean;
  lateEntryThreshold: number;
  earlyExitThreshold: number;
  createdAt?: string;
  updatedAt?: string | null;
}

interface AttendanceStatus {
  status:
    | "present"
    | "absent"
    | "late"
    | "partial"
    | "weekend"
    | "future"
    | "holiday"
    | "weekdayoff";
  color: string;
  icon: React.ComponentType<{ className?: string }> | null;
}

interface AttendanceSummary {
  present: number;
  absent: number;
  late: number;
  total: number;
}

interface AttendanceSummaryAPI {
  employeeId: string;
  fromDate: string;
  toDate: string;
  totalWorkingDays: number;
  daysPresent: number;
  attendancePercentage: number;
}

// Updated interface for API response
interface AttendanceAPIResponse {
  attendance: AttendanceRecord[];
}

const Attendance: React.FC = () => {
  const session = useSession();
  const [id, setId] = useState<string | null | undefined>(undefined);
  const [storeId, setStoreId] = useState<string | null | undefined>(undefined);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  // Calculate start and end dates for the current month
  const startDate: Date = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    1
  );
  const endDate: Date = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth() + 1,
    0
  );

  const { data, isPending } = useGetEmployeeAttendance({
    employeeId: id,
    startDate: startDate.toISOString().split("T")[0],
    endDate: endDate.toISOString().split("T")[0],
    storeId,
  });

  console.log(data);

  const { data: summaryData, isPending: summaryPending } =
    useGetEmployeeAttendanceSummary({
      id: id,
    });

  useEffect(() => {
    if (session.status === "authenticated" && session.data?.user) {
      setId(session.data.user.userId);
      setStoreId(session.data.user.storeId);
    }
  }, [session.status, session.data]);

  const navigateMonth = (direction: "prev" | "next"): void => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      if (direction === "prev") {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const getDaysInMonth = (): number[] => {
    const year: number = currentDate.getFullYear();
    const month: number = currentDate.getMonth();
    const lastDay: Date = new Date(year, month + 1, 0);
    const daysInMonth: number = lastDay.getDate();

    const days: number[] = [];
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }

    return days;
  };

  const getAttendanceForDay = (day: number): AttendanceRecord | null => {
    if (!data || !day) return null;

    const dateStr: string = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      day
    )
      .toISOString()
      .split("T")[0];

    // Fixed: Handle both possible data structures
    let attendanceArray: AttendanceRecord[] = [];

    if (Array.isArray(data)) {
      attendanceArray = data;
    } else if (data && typeof data === "object" && "attendance" in data) {
      attendanceArray = (data as AttendanceAPIResponse).attendance;
    }

    const attendanceRecord: AttendanceRecord | undefined = attendanceArray.find(
      (record: AttendanceRecord) => record.date === dateStr
    );

    return attendanceRecord || null;
  };

  const getAttendanceStatus = (day: number): AttendanceStatus => {
    const attendance: AttendanceRecord | null = getAttendanceForDay(day);
    const dayOfWeek: number = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      day
    ).getDay();
    const isWeekend: boolean = dayOfWeek === 0 || dayOfWeek === 6;
    const today: Date = new Date();
    const currentDay: Date = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      day
    );
    const isFutureDate: boolean = currentDay > today;

    if (isFutureDate)
      return { status: "future", color: "bg-gray-100", icon: null };

    if (isWeekend)
      return { status: "weekend", color: "bg-gray-200", icon: null };

    if (!attendance || attendance.status === "absent")
      return { status: "absent", color: "bg-red-100", icon: MdCancel };

    if (attendance.status === "holiday")
      return { status: "holiday", color: "bg-blue-100", icon: null };

    if (attendance.status === "weekdayoff")
      return { status: "weekdayoff", color: "bg-purple-100", icon: null };

    if (attendance.status === "present") {
      if (attendance.isLateEntry)
        return { status: "late", color: "bg-yellow-100", icon: MdAccessTime };
      else
        return {
          status: "present",
          color: "bg-green-100",
          icon: MdCheckCircle,
        };
    }

    return { status: "partial", color: "bg-orange-100", icon: MdRemoveCircle };
  };

  const formatDate = (day: number): string => {
    const date = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      day
    );
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const monthNames: string[] = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const getAttendanceSummary = (): AttendanceSummary => {
    if (!data) return { present: 0, absent: 0, late: 0, total: 0 };

    const workDays: number[] = getDaysInMonth().filter((day: number) => {
      const dayOfWeek: number = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        day
      ).getDay();
      const today: Date = new Date();
      const currentDay: Date = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        day
      );
      return dayOfWeek !== 0 && dayOfWeek !== 6 && currentDay <= today;
    });

    const present: number = workDays.filter((day: number) => {
      const attendance: AttendanceRecord | null = getAttendanceForDay(day);
      return attendance?.status === "present" && !attendance?.isLateEntry;
    }).length;

    const late: number = workDays.filter((day: number) => {
      const attendance: AttendanceRecord | null = getAttendanceForDay(day);
      return attendance?.status === "present" && attendance?.isLateEntry;
    }).length;

    const absent: number = workDays.filter((day: number) => {
      const attendance: AttendanceRecord | null = getAttendanceForDay(day);
      return !attendance || attendance?.status === "absent";
    }).length;

    return {
      present,
      absent,
      late,
      total: workDays.length,
    };
  };

  if (session.status !== "authenticated") {
    return null;
  }

  // Show skeleton loading instead of the simple loading spinner
  if (isPending || summaryPending) {
    return <AttendanceSkeleton />;
  }

  const summary: AttendanceSummary = getAttendanceSummary();
  const daysInMonth: number[] = getDaysInMonth();
  const apiSummary: AttendanceSummaryAPI | null = summaryData || null;

  return (
    <section className="min-h-screen bg-[var(--tertiary-background)] p-3 sm:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 mb-4 sm:mb-6">
          {/* Mobile-first header layout */}
          <div className="flex flex-col space-y-4 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between mb-4">
            <div className="flex items-center gap-3">
              <MdCalendarToday className="w-6 h-6 sm:w-8 sm:h-8 text-[var(--primary-background)]" />
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-[var(--foreground)]">
                  Attendance Overview
                </h1>
                <p className="text-sm sm:text-base text-gray-600">
                  View your monthly attendance record
                </p>
              </div>
            </div>

            {/* Month Navigation - Responsive */}
            <div className="flex items-center justify-center gap-2 sm:gap-4">
              <button
                onClick={() => navigateMonth("prev")}
                className="p-2 rounded-lg bg-[var(--secondary-background)] hover:bg-[var(--primary-background)] transition-colors"
              >
                <MdChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--foreground)]" />
              </button>

              <div className="text-center min-w-[160px] sm:min-w-[200px]">
                <h2 className="text-lg sm:text-xl font-semibold text-[var(--foreground)]">
                  {monthNames[currentDate.getMonth()]}{" "}
                  <span className="block sm:inline">
                    {currentDate.getFullYear()}
                  </span>
                </h2>
              </div>

              <button
                onClick={() => navigateMonth("next")}
                className="p-2 rounded-lg bg-[var(--secondary-background)] hover:bg-[var(--primary-background)] transition-colors"
              >
                <MdChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--foreground)]" />
              </button>
            </div>
          </div>

          {/* Monthly Attendance Summary - Responsive Grid */}
          {/* <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div className="bg-[var(--tertiary-background)] rounded-lg p-3 sm:p-4 text-center">
              <div className="text-xl sm:text-2xl font-bold text-[var(--foreground)]">
                {summary.total}
              </div>
              <div className="text-xs sm:text-sm text-gray-600">Total Days</div>
            </div>
            <div className="bg-green-50 rounded-lg p-3 sm:p-4 text-center">
              <div className="text-xl sm:text-2xl font-bold text-green-700">
                {summary.present}
              </div>
              <div className="text-xs sm:text-sm text-green-600">Present</div>
            </div>
            <div className="bg-yellow-50 rounded-lg p-3 sm:p-4 text-center">
              <div className="text-xl sm:text-2xl font-bold text-yellow-700">
                {summary.late}
              </div>
              <div className="text-xs sm:text-sm text-yellow-600">Late</div>
            </div>
            <div className="bg-red-50 rounded-lg p-3 sm:p-4 text-center">
              <div className="text-xl sm:text-2xl font-bold text-red-700">
                {summary.absent}
              </div>
              <div className="text-xs sm:text-sm text-red-600">Absent</div>
            </div>
          </div> */}

          {/* Overall Attendance Summary from API */}
          {/* {apiSummary && <AttendanceSummary />} */}
        </div>

        {/* Attendance List View - Mobile Optimized */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-[var(--foreground)] mb-4">
            Daily Attendance Records
          </h3>

          <div className="space-y-2 sm:space-y-3 max-h-80 sm:max-h-96 overflow-y-auto">
            {daysInMonth.map((day: number) => {
              const {
                status,
                color,
                icon: Icon,
              }: AttendanceStatus = getAttendanceStatus(day);
              const attendance: AttendanceRecord | null =
                getAttendanceForDay(day);
              const dayOfWeek: number = new Date(
                currentDate.getFullYear(),
                currentDate.getMonth(),
                day
              ).getDay();
              const isWeekend: boolean = dayOfWeek === 0 || dayOfWeek === 6;
              const today: Date = new Date();
              const currentDay: Date = new Date(
                currentDate.getFullYear(),
                currentDate.getMonth(),
                day
              );
              const isFutureDate: boolean = currentDay > today;

              if (isFutureDate) return null; // Don't show future dates

              return (
                <div
                  key={day}
                  className={`flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 rounded-lg border transition-all hover:shadow-md ${color} ${
                    isWeekend ? "opacity-60" : ""
                  }`}
                >
                  {/* Mobile: Stacked layout */}
                  <div className="flex items-center gap-3 sm:gap-4 mb-2 sm:mb-0">
                    {Icon ? (
                      <Icon
                        className={`w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0 ${
                          status === "present"
                            ? "text-green-600"
                            : status === "late"
                            ? "text-yellow-600"
                            : status === "absent"
                            ? "text-red-600"
                            : "text-orange-600"
                        }`}
                      />
                    ) : (
                      <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gray-300 flex-shrink-0"></div>
                    )}

                    <div className="flex-1">
                      <div className="font-semibold text-sm sm:text-base text-[var(--foreground)]">
                        {formatDate(day)}
                        {isWeekend && (
                          <span className="text-xs sm:text-sm text-gray-500 ml-2">
                            (Weekend)
                          </span>
                        )}
                      </div>
                      <div className="text-xs sm:text-sm text-gray-600 capitalize">
                        {status === "weekend"
                          ? "Weekend"
                          : status === "holiday"
                          ? "Holiday"
                          : status === "weekdayoff"
                          ? "Week Off"
                          : status}
                      </div>
                    </div>
                  </div>

                  {/* Time information - Mobile responsive */}
                  <div className="flex items-center gap-3 sm:gap-6 text-xs sm:text-sm pl-8 sm:pl-0">
                    {attendance?.inTime && (
                      <div className="text-center">
                        <div className="text-gray-500">Check In</div>
                        <div className="font-semibold text-green-700">
                          {attendance.inTime.split("T")[1].slice(0, 5)}
                        </div>
                      </div>
                    )}

                    {attendance?.outTime && (
                      <div className="text-center">
                        <div className="text-gray-500">Check Out</div>
                        <div className="font-semibold text-red-700">
                          {new Date(attendance.outTime).toLocaleTimeString(
                            "en-US",
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: false,
                            }
                          )}
                        </div>
                      </div>
                    )}

                    {(!attendance || attendance.status === "absent") &&
                      !isWeekend && (
                        <div className="text-center">
                          <div className="text-red-600 font-semibold text-xs sm:text-sm">
                            No Record
                          </div>
                        </div>
                      )}

                    {attendance?.status === "holiday" && (
                      <div className="text-center">
                        <div className="text-blue-600 text-xs sm:text-sm">
                          Holiday
                        </div>
                      </div>
                    )}

                    {attendance?.status === "weekdayoff" && (
                      <div className="text-center">
                        <div className="text-purple-600 text-xs sm:text-sm">
                          Week Off
                        </div>
                      </div>
                    )}

                    {isWeekend && (
                      <div className="text-center">
                        <div className="text-gray-500 text-xs sm:text-sm">
                          Off Day
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend - Mobile Optimized */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 mt-4 sm:mt-6">
          <h3 className="text-sm font-semibold text-[var(--foreground)] mb-3">
            Status Legend
          </h3>
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-3 sm:gap-6 text-xs sm:text-sm">
            <div className="flex items-center gap-2">
              <MdCheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
              <span>Present</span>
            </div>
            <div className="flex items-center gap-2">
              <MdAccessTime className="w-4 h-4 text-yellow-600 flex-shrink-0" />
              <span>Late Arrival</span>
            </div>
            <div className="flex items-center gap-2">
              <MdCancel className="w-4 h-4 text-red-600 flex-shrink-0" />
              <span>Absent</span>
            </div>
            <div className="flex items-center gap-2">
              <MdRemoveCircle className="w-4 h-4 text-orange-600 flex-shrink-0" />
              <span>Partial</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-300 rounded-full flex-shrink-0"></div>
              <span>Weekend</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-300 rounded-full flex-shrink-0"></div>
              <span>Holiday</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-purple-300 rounded-full flex-shrink-0"></div>
              <span>Week Off</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Attendance;
