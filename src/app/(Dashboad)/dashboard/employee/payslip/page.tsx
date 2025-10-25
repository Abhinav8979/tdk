"use client";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { IoChevronBack, IoChevronForward } from "react-icons/io5";
import PayslipGenerator from "@/components/dashboard/hr/expenses/PayslipGenerator";

export default function MonthSelector() {
  const { data: session } = useSession();
  const today = new Date();

  // Calendar months
  const monthsList: string[] = [
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

  // Default to previous month
  const prevMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const [selectedMonth, setSelectedMonth] = useState<Date>(prevMonthDate);

  // Toggle for picker
  const [showPicker, setShowPicker] = useState(false);

  // Change month with arrows
  const changeMonth = (direction: number) => {
    const newDate = new Date(selectedMonth);
    newDate.setMonth(selectedMonth.getMonth() + direction);

    // Prevent future months
    if (newDate > today) return;

    setSelectedMonth(newDate);
  };

  const isNextDisabled =
    selectedMonth.getMonth() === today.getMonth() &&
    selectedMonth.getFullYear() === today.getFullYear();

  // Handle manual selection
  const handleSelect = (year: number, month: number) => {
    const newDate = new Date(year, month, 1);

    if (newDate > today) return; // prevent future
    setSelectedMonth(newDate);
    setShowPicker(false);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6">
      <h2 className="text-xl font-semibold">Select Month</h2>

      <div className="flex items-center gap-4 relative">
        {/* Prev Button */}
        <button
          onClick={() => changeMonth(-1)}
          className="flex items-center justify-center w-10 h-10 bg-[var(--primary-background)] text-white rounded-full hover:bg-[var(--secondary-background)] active:scale-95 transition-all duration-200 shadow-lg hover:shadow-xl"
        >
          <IoChevronBack size={20} />
        </button>

        {/* Month Display (clickable) */}
        <span
          className="text-lg font-medium w-40 text-center cursor-pointer underline"
          onClick={() => setShowPicker(!showPicker)}
        >
          {monthsList[selectedMonth.getMonth()]} {selectedMonth.getFullYear()}
        </span>

        {/* Next Button */}
        <button
          onClick={() => changeMonth(1)}
          disabled={isNextDisabled}
          className="flex items-center justify-center w-10 h-10 bg-[var(--primary-background)] text-white rounded-full hover:bg-[var(--secondary-background)] active:scale-95 transition-all duration-200 shadow-lg hover:shadow-xl disabled:bg-gray-300 disabled:hover:bg-gray-300 disabled:cursor-not-allowed disabled:shadow-none disabled:active:scale-100"
        >
          <IoChevronForward size={20} />
        </button>

        {/* Picker Dropdown */}
        {showPicker && (
          <div className="absolute top-12 left-1/2 w-3/4 md:w-xl lg:w-2xl -translate-x-1/2 bg-white shadow-xl border rounded-xl p-4 z-50">
            <div className="flex flex-col gap-3 max-h-60 overflow-y-auto">
              {[...Array(5)].map((_, i) => {
                const year = today.getFullYear() - i;
                return (
                  <div key={year}>
                    <h4 className="font-semibold mb-2">{year}</h4>
                    <div className="grid grid-cols-3 gap-2">
                      {monthsList.map((m, idx) => {
                        const monthDate = new Date(year, idx, 1);
                        const isDisabled = monthDate > today;
                        return (
                          <button
                            key={m}
                            onClick={() => handleSelect(year, idx)}
                            disabled={isDisabled}
                            className={`px-2 py-1 rounded-md text-sm ${
                              isDisabled
                                ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                                : "bg-[var(--secondary-background)] hover:bg-[var(--primary-background)] hover:text-white"
                            }`}
                          >
                            {m.slice(0, 3)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Payslip Generator */}
      {session && "userId" in session.user && (
        <PayslipGenerator
          id={(session.user as { userId: string }).userId}
          month={String(selectedMonth.getMonth() + 1)}
          year={String(selectedMonth.getFullYear())}
          editable={false}
        />
      )}
    </div>
  );
}
