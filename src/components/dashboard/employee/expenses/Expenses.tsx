"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useGetEmployeeExpenses } from "@/hooks/RTKHooks";
import {
  FaCalendarAlt,
  FaMapMarkerAlt,
  FaGasPump,
  FaDollarSign,
  FaUser,
  FaBuilding,
  FaChevronLeft,
  FaChevronRight,
} from "react-icons/fa";
import ExpenseSkeleton from "@/components/skeleton/employee/expeneses/ExpenseSkeleton";

// Type definitions
interface Expense {
  id: string;
  date: string;
  initialReading: number;
  finalReading: number;
  totalDistance: number;
  rate: number;
  fuelTotal: number;
  amount: number;
  miscellaneousExpense: number;
  createdAt: string;
  updatedAt: string;
}

interface ExpenseData {
  employeeId: string;
  email: string;
  username: string;
  storeId: string;
  storeName: string | null;
  expenses: Expense[];
}

interface SessionUser {
  userId: string;
  storeId: string;
}

const Expenses: React.FC = () => {
  const { data: session, status } = useSession();
  const [id, setId] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [calendarDate, setCalendarDate] = useState<Date>(new Date());
  const datePickerRef = useRef<HTMLDivElement>(null);

  // Generate start and end dates based on currentDate (same day)
  const getDayDates = (date: Date) => {
    const startDate = new Date(date);
    const endDate = new Date(date);

    return {
      startDate: startDate,
      endDate: endDate,
    };
  };

  const { startDate, endDate } = getDayDates(currentDate);

  const {
    data,
    isPending,
    refetch,
  }: {
    data: ExpenseData | undefined;
    isPending: boolean;
    refetch: () => void;
  } = useGetEmployeeExpenses({
    employeeId: id,
    startDate,
    endDate,
  });

  useEffect(() => {
    if (status === "authenticated" && session?.user?.userId) {
      setId(session.user.userId);
    }
  }, [status, session]);

  // Refetch data when dates change
  useEffect(() => {
    if (id) {
      refetch();
    }
  }, [startDate, endDate, id, refetch]);

  // Close date picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        datePickerRef.current &&
        !datePickerRef.current.contains(event.target as Node)
      ) {
        setShowDatePicker(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handlePreviousDay = () => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() - 1);
      return newDate;
    });
  };

  const handleNextDay = () => {
    const today = new Date();
    const nextDay = new Date(currentDate);
    nextDay.setDate(nextDay.getDate() + 1);

    // Prevent going to future days
    if (nextDay <= today) {
      setCurrentDate(nextDay);
    }
  };

  const isNextDayDisabled = () => {
    const today = new Date();
    const nextDay = new Date(currentDate);
    nextDay.setDate(nextDay.getDate() + 1);
    return nextDay > today;
  };

  const formatDateDisplay = (date: Date): string => {
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Today";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString("en-IN", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    }
  };

  const formatDateDisplayMobile = (date: Date): string => {
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Today";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString("en-IN", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }
  };

  const handleDateSelect = (selectedDate: Date) => {
    const today = new Date();
    // Only allow dates up to today
    if (selectedDate <= today) {
      setCurrentDate(selectedDate);
      setShowDatePicker(false);
    }
  };

  const renderCalendar = () => {
    const today = new Date();
    const firstDayOfMonth = new Date(
      calendarDate.getFullYear(),
      calendarDate.getMonth(),
      1
    );

    const startDate = new Date(firstDayOfMonth);
    startDate.setDate(startDate.getDate() - firstDayOfMonth.getDay());

    const days = [];
    const current = new Date(startDate);

    for (let i = 0; i < 42; i++) {
      const isCurrentMonth = current.getMonth() === calendarDate.getMonth();
      const isToday = current.toDateString() === today.toDateString();
      const isSelected = current.toDateString() === currentDate.toDateString();
      const isFuture = current > today;

      days.push(
        <button
          key={current.getTime()}
          onClick={() => !isFuture && handleDateSelect(new Date(current))}
          disabled={isFuture}
          className={`
            p-2 text-sm rounded-lg transition-colors
            ${!isCurrentMonth ? "text-gray-400" : ""}
            ${isToday ? "bg-blue-500 text-white" : ""}
            ${
              isSelected && !isToday
                ? "bg-[var(--primary-background)] text-white"
                : ""
            }
            ${
              isFuture
                ? "text-gray-300 cursor-not-allowed"
                : "hover:bg-gray-100 cursor-pointer"
            }
            ${
              !isSelected && !isToday && !isFuture
                ? "text-[var(--foreground)]"
                : ""
            }
          `}
        >
          {current.getDate()}
        </button>
      );

      current.setDate(current.getDate() + 1);
    }

    return days;
  };

  const handleCalendarNavigation = (direction: "prev" | "next") => {
    setCalendarDate((prev) => {
      const newDate = new Date(prev);
      if (direction === "prev") {
        newDate.setMonth(newDate.getMonth() - 1);
      } else {
        newDate.setMonth(newDate.getMonth() + 1);
      }
      return newDate;
    });
  };

  // Loading state
  if (isPending) {
    return <ExpenseSkeleton />;
  }

  // No data or empty expenses
  if (!data || !data.expenses || data.expenses.length === 0) {
    return (
      <div className="min-h-screen bg-[var(--tertiary-background)]">
        {/* Date Navigation Header */}
        <div className="bg-[var(--primary-background)] shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
            <div className="flex items-center justify-center gap-2 sm:gap-4 relative">
              <button
                onClick={handlePreviousDay}
                className="p-2 rounded-lg hover:bg-[var(--secondary-background)] transition-colors touch-manipulation"
              >
                <FaChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--foreground)]" />
              </button>

              <button
                onClick={() => setShowDatePicker(!showDatePicker)}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg hover:bg-[var(--secondary-background)] transition-colors flex-1 sm:flex-none justify-center sm:min-w-[300px] max-w-[280px] sm:max-w-none"
              >
                <FaCalendarAlt className="w-3 h-3 sm:w-4 sm:h-4 text-[var(--foreground)]" />
                <span className="text-lg sm:text-xl font-semibold text-[var(--foreground)] truncate">
                  <span className="hidden sm:inline">
                    {formatDateDisplay(currentDate)}
                  </span>
                  <span className="sm:hidden">
                    {formatDateDisplayMobile(currentDate)}
                  </span>
                </span>
              </button>

              <button
                onClick={handleNextDay}
                disabled={isNextDayDisabled()}
                className={`p-2 rounded-lg transition-colors touch-manipulation ${
                  isNextDayDisabled()
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:bg-[var(--secondary-background)]"
                }`}
              >
                <FaChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--foreground)]" />
              </button>

              {/* Date Picker */}
              {showDatePicker && (
                <div
                  ref={datePickerRef}
                  className="absolute top-full mt-2 bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-50 w-[95vw] max-w-[320px] left-1/2 transform -translate-x-1/2"
                >
                  <div className="flex items-center justify-between mb-4">
                    <button
                      onClick={() => handleCalendarNavigation("prev")}
                      className="p-1 rounded hover:bg-gray-100 touch-manipulation"
                    >
                      <FaChevronLeft className="w-4 h-4" />
                    </button>
                    <h3 className="font-semibold text-gray-800 text-sm sm:text-base">
                      {calendarDate.toLocaleDateString("en-IN", {
                        year: "numeric",
                        month: "long",
                      })}
                    </h3>
                    <button
                      onClick={() => handleCalendarNavigation("next")}
                      className="p-1 rounded hover:bg-gray-100 touch-manipulation"
                    >
                      <FaChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
                      <div
                        key={day}
                        className="p-1 sm:p-2 text-center text-xs font-medium text-gray-500"
                      >
                        {day}
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-1">
                    {renderCalendar()}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center min-h-[60vh] px-4">
          <div className="text-center p-4 sm:p-8">
            <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-4 sm:mb-6 bg-[var(--secondary-background)] rounded-full flex items-center justify-center">
              <FaDollarSign className="w-10 h-10 sm:w-12 sm:h-12 text-[var(--foreground)] opacity-50" />
            </div>
            <h2 className="text-xl sm:text-2xl font-semibold text-[var(--foreground)] mb-2">
              No Expenses Available
            </h2>
            <p className="text-sm sm:text-base text-[var(--foreground)] opacity-70">
              No expenses found for {data?.username || "this user"} on{" "}
              <span className="hidden sm:inline">
                {formatDateDisplay(currentDate)}
              </span>
              <span className="sm:hidden">
                {formatDateDisplayMobile(currentDate)}
              </span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount);
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const calculateTotal = (
    expenses: Expense[],
    field: keyof Expense
  ): number => {
    return expenses.reduce((sum: number, exp: Expense) => {
      const value = exp[field];
      return sum + (typeof value === "number" ? value : 0);
    }, 0);
  };

  return (
    <div className="min-h-screen bg-[var(--tertiary-background)]">
      {/* Header Section with Date Navigation */}
      <div className="bg-[var(--primary-background)] shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          {/* Date Navigation */}
          <div className="flex items-center justify-center gap-2 sm:gap-4 mb-4 sm:mb-6 relative">
            <button
              onClick={handlePreviousDay}
              className="p-2 rounded-lg hover:bg-[var(--secondary-background)] transition-colors touch-manipulation"
            >
              <FaChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--foreground)]" />
            </button>

            <button
              onClick={() => setShowDatePicker(!showDatePicker)}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg hover:bg-[var(--secondary-background)] transition-colors flex-1 sm:flex-none justify-center sm:min-w-[300px] max-w-[280px] sm:max-w-none"
            >
              <FaCalendarAlt className="w-3 h-3 sm:w-4 sm:h-4 text-[var(--foreground)]" />
              <span className="text-lg sm:text-xl font-semibold text-[var(--foreground)] truncate">
                <span className="hidden sm:inline">
                  {formatDateDisplay(currentDate)}
                </span>
                <span className="sm:hidden">
                  {formatDateDisplayMobile(currentDate)}
                </span>
              </span>
            </button>

            <button
              onClick={handleNextDay}
              disabled={isNextDayDisabled()}
              className={`p-2 rounded-lg transition-colors touch-manipulation ${
                isNextDayDisabled()
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-[var(--secondary-background)]"
              }`}
            >
              <FaChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--foreground)]" />
            </button>

            {/* Date Picker */}
            {showDatePicker && (
              <div
                ref={datePickerRef}
                className="absolute top-full mt-2 bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-50 w-[95vw] max-w-[320px] left-1/2 transform -translate-x-1/2"
              >
                <div className="flex items-center justify-between mb-4">
                  <button
                    onClick={() => handleCalendarNavigation("prev")}
                    className="p-1 rounded hover:bg-gray-100 touch-manipulation"
                  >
                    <FaChevronLeft className="w-4 h-4" />
                  </button>
                  <h3 className="font-semibold text-gray-800 text-sm sm:text-base">
                    {calendarDate.toLocaleDateString("en-IN", {
                      year: "numeric",
                      month: "long",
                    })}
                  </h3>
                  <button
                    onClick={() => handleCalendarNavigation("next")}
                    className="p-1 rounded hover:bg-gray-100 touch-manipulation"
                  >
                    <FaChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-7 gap-1 mb-2">
                  {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
                    <div
                      key={day}
                      className="p-1 sm:p-2 text-center text-xs font-medium text-gray-500"
                    >
                      {day}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1">{renderCalendar()}</div>
              </div>
            )}
          </div>

          {/* Main Header Info - Mobile Responsive */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-[var(--foreground)] mb-2">
                Daily Expense Report
              </h1>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 text-[var(--foreground)] opacity-80">
                <div className="flex items-center gap-2">
                  <FaUser className="w-4 h-4" />
                  <span className="font-medium text-sm sm:text-base">
                    {data.username}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <FaBuilding className="w-4 h-4" />
                  <span className="text-sm sm:text-base">
                    {data.storeName || "N/A"}
                  </span>
                </div>
              </div>
            </div>
            <div className="text-center lg:text-right bg-[var(--secondary-background)] lg:bg-transparent rounded-lg p-3 lg:p-0">
              <div className="text-xs sm:text-sm text-[var(--foreground)] opacity-70 mb-1">
                Total Expenses
              </div>
              <div className="text-xl sm:text-2xl font-bold text-[var(--foreground)]">
                {formatCurrency(calculateTotal(data.expenses, "amount"))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Expenses List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
        <div className="grid gap-4 sm:gap-6">
          {data.expenses.map((expense: Expense) => (
            <div
              key={expense.id}
              className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow duration-200"
            >
              <div className="p-4 sm:p-6">
                {/* Mobile-first header layout */}
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[var(--secondary-background)] rounded-lg flex items-center justify-center">
                      <FaCalendarAlt className="w-5 h-5 sm:w-6 sm:h-6 text-[var(--foreground)]" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-[var(--foreground)] text-base sm:text-lg">
                        {formatDate(expense.date)}
                      </h3>
                      <p className="text-xs sm:text-sm text-[var(--foreground)] opacity-60">
                        ID: {expense.id.slice(0, 8)}...
                      </p>
                    </div>
                  </div>
                  <div className="text-center sm:text-right bg-[var(--tertiary-background)] sm:bg-transparent rounded-lg p-3 sm:p-0">
                    <div className="text-xl sm:text-2xl font-bold text-[var(--primary-background)]">
                      {formatCurrency(expense.amount)}
                    </div>
                    <div className="text-xs sm:text-sm text-[var(--foreground)] opacity-60">
                      Total Amount
                    </div>
                  </div>
                </div>

                {/* Responsive grid - stack on mobile */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  {/* Distance Info */}
                  <div className="bg-[var(--tertiary-background)] rounded-lg p-3 sm:p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <FaMapMarkerAlt className="w-4 h-4 text-[var(--primary-background)]" />
                      <span className="text-sm font-medium text-[var(--foreground)]">
                        Distance
                      </span>
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs text-[var(--foreground)] opacity-60">
                        Initial: {expense.initialReading} km
                      </div>
                      <div className="text-xs text-[var(--foreground)] opacity-60">
                        Final: {expense.finalReading} km
                      </div>
                      <div className="font-semibold text-[var(--foreground)] text-sm sm:text-base">
                        Total: {expense.totalDistance} km
                      </div>
                    </div>
                  </div>

                  {/* Fuel Info */}
                  <div className="bg-[var(--tertiary-background)] rounded-lg p-3 sm:p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <FaGasPump className="w-4 h-4 text-[var(--primary-background)]" />
                      <span className="text-sm font-medium text-[var(--foreground)]">
                        Fuel
                      </span>
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs text-[var(--foreground)] opacity-60">
                        Rate: ₹{expense.rate}/km
                      </div>
                      <div className="font-semibold text-[var(--foreground)] text-sm sm:text-base">
                        {formatCurrency(expense.fuelTotal)}
                      </div>
                    </div>
                  </div>

                  {/* Miscellaneous */}
                  <div className="bg-[var(--tertiary-background)] rounded-lg p-3 sm:p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <FaDollarSign className="w-4 h-4 text-[var(--primary-background)]" />
                      <span className="text-sm font-medium text-[var(--foreground)]">
                        Miscellaneous
                      </span>
                    </div>
                    <div className="font-semibold text-[var(--foreground)] text-sm sm:text-base">
                      {formatCurrency(expense.miscellaneousExpense || 0)}
                    </div>
                  </div>

                  {/* Timestamps */}
                  <div className="bg-[var(--tertiary-background)] rounded-lg p-3 sm:p-4">
                    <div className="text-sm font-medium text-[var(--foreground)] mb-2">
                      Created
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs text-[var(--foreground)] opacity-60">
                        {formatDate(expense.createdAt)}
                      </div>
                      {expense.updatedAt !== expense.createdAt && (
                        <div className="text-xs text-[var(--foreground)] opacity-60">
                          Updated: {formatDate(expense.updatedAt)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Summary Footer - Mobile Responsive */}
        <div className="mt-6 sm:mt-8 bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 text-center">
            <div className="bg-[var(--tertiary-background)] sm:bg-transparent rounded-lg p-3 sm:p-0">
              <div className="text-xl sm:text-2xl font-bold text-[var(--primary-background)] mb-1">
                {data.expenses.length}
              </div>
              <div className="text-sm text-[var(--foreground)] opacity-60">
                Total Entries
              </div>
            </div>
            <div className="bg-[var(--tertiary-background)] sm:bg-transparent rounded-lg p-3 sm:p-0">
              <div className="text-xl sm:text-2xl font-bold text-[var(--primary-background)] mb-1">
                {calculateTotal(data.expenses, "totalDistance")} km
              </div>
              <div className="text-sm text-[var(--foreground)] opacity-60">
                Total Distance
              </div>
            </div>
            <div className="bg-[var(--tertiary-background)] sm:bg-transparent rounded-lg p-3 sm:p-0">
              <div className="text-xl sm:text-2xl font-bold text-[var(--primary-background)] mb-1">
                {formatCurrency(calculateTotal(data.expenses, "fuelTotal"))}
              </div>
              <div className="text-sm text-[var(--foreground)] opacity-60">
                Total Fuel Cost
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Expenses;
