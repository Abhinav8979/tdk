"use client";
import PayrollSystemSkeleton from "@/components/skeleton/Hr/payslipTable/PayslipTableSkeleton";
import { useAppDispatch } from "@/hooks/ReduxSelector";
import { useGetPayslips } from "@/hooks/RTKHooks";
import { rootHrRoute } from "@/lib/paths";
import { setLoading } from "@/redux/store/utils";
import { useRouter } from "next/navigation";
import React, { useState, useEffect } from "react";
import {
  MdChevronLeft,
  MdChevronRight,
  MdCalendarToday,
  MdEdit,
  MdArrowDropDown,
  MdFirstPage,
  MdLastPage,
  MdSearch,
  MdClear,
} from "react-icons/md";

interface Employee {
  employeeId: string;
  email: string;
  username: string;
  storeId: string;
  storeName: string;
  salaries: Salary[];
}

interface Salary {
  id?: string;
  basicSalary: number;
  month: string;
  year: number;
  absentDays?: number;
  totalDeductions?: number;
  netSalary?: number;
}

const PayrollSystem = () => {
  const [currentMonth, setCurrentMonth] = useState(() => {
    return new Date().getMonth();
  });

  const [currentYear, setCurrentYear] = useState(() => {
    return new Date().getFullYear();
  });

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const itemsPerPage = 10;
  const router = useRouter();

  const dispatch = useAppDispatch();

  // Reset to first page when month/year changes or search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [currentMonth, currentYear, searchTerm]);

  const { data, isPending } = useGetPayslips({
    allEmployees: true,
    month: currentMonth + 1 === 13 ? 1 : currentMonth + 1,
    year: currentYear,
  });

  if (isPending) {
    return <PayrollSystemSkeleton />;
  }

  const months = [
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

  const today = new Date();
  const currentDate = new Date(currentYear, currentMonth);
  const adjustedCurrentMonth =
    today.getMonth() === 0 ? 11 : today.getMonth() - 1;

  const isFutureMonth =
    currentDate > new Date(today.getFullYear(), adjustedCurrentMonth);

  const navigateMonth = (direction: "prev" | "next") => {
    if (direction === "next" && isFutureMonth) return;

    if (direction === "next") {
      if (currentMonth === 11) {
        setCurrentMonth(0);
        setCurrentYear(currentYear + 1);
      } else {
        setCurrentMonth(currentMonth + 1);
      }
    } else {
      if (currentMonth === 0) {
        setCurrentMonth(11);
        setCurrentYear(currentYear - 1);
      } else {
        setCurrentMonth(currentMonth - 1);
      }
    }
  };

  const handleDateSelection = (month: number, year: number) => {
    setCurrentMonth(month);
    setCurrentYear(year);
    setShowDatePicker(false);
  };

  const generateYearOptions = () => {
    const currentFullYear = new Date().getFullYear();
    const years = [];

    // Generate years from current year going back 5 years
    for (let i = currentFullYear; i >= currentFullYear - 5; i--) {
      years.push(i);
    }

    return years;
  };

  // Handle case where data might be undefined or empty
  const allEmployees: Employee[] = data || [];

  // Filter employees based on search term
  const filteredEmployees = allEmployees.filter(
    (employee) =>
      employee.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination calculations
  const totalEmployees = filteredEmployees.length;
  const totalPages = Math.ceil(totalEmployees / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentEmployees = filteredEmployees.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const clearSearch = () => {
    setSearchTerm("");
  };

  const getVisiblePages = () => {
    const maxVisiblePages = 5;
    const pages = [];

    if (totalPages <= maxVisiblePages) {
      // Show all pages if total pages is less than max visible
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Show first page, current page with neighbors, and last page
      const startPage = Math.max(1, currentPage - 2);
      const endPage = Math.min(totalPages, currentPage + 2);

      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
    }

    return pages;
  };

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="max-w-7xl mx-auto px-3 py-2">
        {/* Month Navigation */}
        <div className="mb-8 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-lg p-2 border border-lime-100">
            <div className="flex items-center gap-6">
              <button
                onClick={() => navigateMonth("prev")}
                className="bg-lime-400 hover:bg-lime-500 p-2 rounded-xl transition-colors shadow-md"
              >
                <MdChevronLeft size={24} className="text-stone-700" />
              </button>

              <div className="relative">
                <button
                  onClick={() => setShowDatePicker(!showDatePicker)}
                  className="flex items-center gap-3 hover:bg-stone-50 p-2 rounded-xl transition-colors"
                >
                  <MdCalendarToday size={24} className="text-stone-600" />
                  <span className="font-bold text-2xl text-stone-700 min-w-[200px] text-center">
                    {months[currentMonth]} {currentYear}
                  </span>
                  <MdArrowDropDown size={24} className="text-stone-600" />
                </button>

                {/* Date Picker Dropdown */}
                {showDatePicker && (
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 bg-white rounded-xl shadow-2xl border border-lime-100 p-4 z-50 min-w-[320px] max-h-[400px] overflow-y-auto">
                    <div className="text-center mb-4">
                      <h3 className="font-semibold text-stone-700">
                        Select Month & Year
                      </h3>
                    </div>

                    {/* Year Selection */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-stone-600 mb-2">
                        Year
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {generateYearOptions().map((year) => {
                          const isCurrentYear = year === currentYear;
                          return (
                            <button
                              key={year}
                              onClick={() => setCurrentYear(year)}
                              className={`p-2 rounded-lg text-sm font-medium transition-colors ${
                                isCurrentYear
                                  ? "bg-lime-400 text-stone-700"
                                  : "bg-stone-100 hover:bg-lime-100 text-stone-700"
                              }`}
                            >
                              {year}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Month Selection */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-stone-600 mb-2">
                        Month
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {months.map((month, index) => {
                          const isCurrentMonth =
                            index === currentMonth &&
                            currentYear === currentYear;
                          const isFutureMonth =
                            new Date(currentYear, index) >
                            new Date(
                              new Date().getFullYear(),
                              new Date().getMonth()
                            );
                          return (
                            <button
                              key={month}
                              onClick={() =>
                                !isFutureMonth &&
                                handleDateSelection(index, currentYear)
                              }
                              disabled={isFutureMonth}
                              className={`p-2 rounded-lg text-sm font-medium transition-colors ${
                                isCurrentMonth
                                  ? "bg-lime-400 text-stone-700"
                                  : isFutureMonth
                                  ? "bg-stone-100 text-stone-400 cursor-not-allowed"
                                  : "bg-stone-100 hover:bg-lime-100 text-stone-700"
                              }`}
                            >
                              {month.slice(0, 3)}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="flex gap-2 pt-2 border-t border-stone-200">
                      <button
                        onClick={() => {
                          const today = new Date();
                          handleDateSelection(
                            today.getMonth(),
                            today.getFullYear()
                          );
                        }}
                        className="flex-1 bg-lime-100 hover:bg-lime-200 text-stone-700 p-2 rounded-lg text-sm font-medium transition-colors"
                      >
                        Current Month
                      </button>
                      <button
                        onClick={() => setShowDatePicker(false)}
                        className="flex-1 bg-stone-100 hover:bg-stone-200 text-stone-700 p-2 rounded-lg text-sm font-medium transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={() => navigateMonth("next")}
                disabled={isFutureMonth}
                className={`p-2 rounded-xl transition-colors shadow-md ${
                  isFutureMonth
                    ? "bg-stone-200 cursor-not-allowed"
                    : "bg-lime-400 hover:bg-lime-500"
                }`}
              >
                <MdChevronRight
                  size={24}
                  className={
                    isFutureMonth ? "text-stone-400" : "text-stone-700"
                  }
                />
              </button>
            </div>
          </div>
        </div>

        {/* Search Box */}
        <div className="mb-6 flex justify-center">
          <div className="bg-white rounded-2xl shadow-lg border border-lime-100 p-1 w-full max-w-md">
            <div className="relative flex items-center">
              <MdSearch size={20} className="absolute left-4 text-stone-500" />
              <input
                type="text"
                placeholder="Search employees by name or email..."
                value={searchTerm}
                onChange={handleSearchChange}
                className="w-full pl-12 pr-12 py-3 rounded-xl border-none outline-none text-stone-700 placeholder-stone-400 bg-transparent"
              />
              {searchTerm && (
                <button
                  onClick={clearSearch}
                  className="absolute right-4 text-stone-400 hover:text-stone-600 transition-colors"
                >
                  <MdClear size={20} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Search Results Info */}
        {searchTerm && (
          <div className="mb-4 text-center">
            <span className="text-stone-600">
              {totalEmployees === 0
                ? `No employees found for "${searchTerm}"`
                : totalEmployees === 1
                ? `1 employee found for "${searchTerm}"`
                : `${totalEmployees} employees found for "${searchTerm}"`}
            </span>
          </div>
        )}

        {/* Payroll Table */}
        {/* Desktop Table View - Hidden on mobile */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-lime-100 border-b border-lime-200">
                <th className="p-4 text-left font-semibold text-stone-700">
                  Employee
                </th>
                <th className="p-4 text-left font-semibold text-stone-700">
                  Basic Salary
                </th>
                <th className="p-4 text-left font-semibold text-stone-700">
                  Absent Days
                </th>
                <th className="p-4 text-left font-semibold text-stone-700">
                  Deductions
                </th>
                <th className="p-4 text-left font-semibold text-stone-700">
                  Net Salary
                </th>
                <th className="p-4 text-center font-semibold text-stone-700">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {currentEmployees.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-stone-500">
                    {searchTerm
                      ? `No employees found matching "${searchTerm}" for this period`
                      : "No employees found for this period"}
                  </td>
                </tr>
              ) : (
                currentEmployees.map((employee, index) => {
                  const basicSalary = employee.salaries[0]?.basicSalary || 0;
                  const absentDays = employee.salaries[0]?.absentDays || 0;
                  const totalDeductions =
                    employee.salaries[0]?.totalDeductions || 0;
                  const perDayDeduction =
                    basicSalary > 0 ? Math.round(basicSalary / 30) : 0;
                  const absenteeDeduction = absentDays * perDayDeduction;
                  const netSalary = employee.salaries[0]?.netSalary ?? 0;

                  return (
                    <tr
                      key={employee.employeeId}
                      className={`border-b border-stone-100 hover:bg-stone-50 transition-colors ${
                        index % 2 === 0 ? "bg-white" : "bg-stone-25"
                      }`}
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="bg-lime-100 p-2 rounded-full">
                            <span className="font-bold text-lime-600 text-sm">
                              {employee.username
                                .split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </span>
                          </div>
                          <div>
                            <div className="font-semibold text-stone-700">
                              {employee.username}
                            </div>
                            <div className="text-sm text-stone-500">
                              {employee.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 font-semibold text-stone-700">
                        {basicSalary > 0
                          ? `₹${basicSalary.toLocaleString()}`
                          : "Not Set"}
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium ${
                            absentDays > 0
                              ? "bg-red-100 text-red-700"
                              : "bg-green-100 text-green-700"
                          }`}
                        >
                          {absentDays} days
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="space-y-1">
                          <div className="text-sm text-stone-600">
                            Absent: ₹{absenteeDeduction.toLocaleString()}
                          </div>
                          <div className="text-sm text-stone-600">
                            Other: ₹{totalDeductions.toLocaleString()}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span
                          className={`font-bold text-lg ${
                            netSalary >= 0 ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          ₹{netSalary.toLocaleString()}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <button
                          disabled={isFutureMonth}
                          onClick={() => {
                            dispatch(setLoading(true));
                            router.push(
                              `${rootHrRoute}/payslips/${
                                employee.employeeId
                              }?month=${
                                currentMonth + 1 === 13 ? 1 : currentMonth + 1
                              }&year=${currentYear}`
                            );
                          }}
                          className={`px-4 py-2 rounded-xl font-medium flex items-center gap-2 mx-auto transition-all ${
                            isFutureMonth
                              ? "bg-stone-200 text-stone-400 cursor-not-allowed"
                              : "bg-lime-400 hover:bg-lime-500 text-stone-700 shadow-md hover:shadow-lg"
                          }`}
                        >
                          <MdEdit size={16} />
                          Generate Payslip
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View - Visible only on mobile */}
        <div className="lg:hidden divide-y divide-stone-200">
          {currentEmployees.length === 0 ? (
            <div className="p-8 text-center text-stone-500">
              {searchTerm
                ? `No employees found matching "${searchTerm}" for this period`
                : "No employees found for this period"}
            </div>
          ) : (
            currentEmployees.map((employee, index) => {
              const basicSalary = employee.salaries[0]?.basicSalary || 0;
              const absentDays = employee.salaries[0]?.absentDays || 0;
              const totalDeductions =
                employee.salaries[0]?.totalDeductions || 0;
              const perDayDeduction =
                basicSalary > 0 ? Math.round(basicSalary / 30) : 0;
              const absenteeDeduction = absentDays * perDayDeduction;
              const netSalary = employee.salaries[0]?.netSalary ?? 0;

              return (
                <div
                  key={employee.employeeId}
                  className="p-4 bg-white hover:bg-stone-50 transition-colors"
                >
                  {/* Employee Info */}
                  <div className="flex items-start gap-3 mb-4">
                    <div className="bg-lime-100 p-2 rounded-full flex-shrink-0">
                      <span className="font-bold text-lime-600 text-sm">
                        {employee.username
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-stone-700 truncate">
                        {employee.username}
                      </div>
                      <div className="text-sm text-stone-500 truncate">
                        {employee.email}
                      </div>
                    </div>
                  </div>

                  {/* Salary Details Grid */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-stone-50 p-3 rounded-lg">
                      <div className="text-xs text-stone-500 mb-1">
                        Basic Salary
                      </div>
                      <div className="font-semibold text-stone-700">
                        {basicSalary > 0
                          ? `₹${basicSalary.toLocaleString()}`
                          : "Not Set"}
                      </div>
                    </div>

                    <div className="bg-stone-50 p-3 rounded-lg">
                      <div className="text-xs text-stone-500 mb-1">
                        Absent Days
                      </div>
                      <span
                        className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                          absentDays > 0
                            ? "bg-red-100 text-red-700"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {absentDays} days
                      </span>
                    </div>

                    <div className="bg-stone-50 p-3 rounded-lg">
                      <div className="text-xs text-stone-500 mb-1">
                        Deductions
                      </div>
                      <div className="text-xs space-y-0.5">
                        <div className="text-stone-600">
                          Absent: ₹{absenteeDeduction.toLocaleString()}
                        </div>
                        <div className="text-stone-600">
                          Other: ₹{totalDeductions.toLocaleString()}
                        </div>
                      </div>
                    </div>

                    <div className="bg-stone-50 p-3 rounded-lg">
                      <div className="text-xs text-stone-500 mb-1">
                        Net Salary
                      </div>
                      <div
                        className={`font-bold text-base ${
                          netSalary >= 0 ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        ₹{netSalary.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {/* Action Button */}
                  <button
                    disabled={isFutureMonth}
                    className={`w-full px-4 py-2.5 rounded-xl font-medium flex items-center justify-center gap-2 transition-all ${
                      isFutureMonth
                        ? "bg-stone-200 text-stone-400 cursor-not-allowed"
                        : "bg-lime-400 hover:bg-lime-500 text-stone-700 shadow-md hover:shadow-lg active:scale-98"
                    }`}
                  >
                    <MdEdit size={16} />
                    Generate Payslip
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination */}
        {totalEmployees > itemsPerPage && (
          <div className="bg-stone-50 px-3 sm:px-6 py-3 sm:py-4 border-t border-stone-200">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs sm:text-sm text-stone-600 order-2 sm:order-1">
                Page {currentPage} of {totalPages}
              </div>

              <div className="flex items-center gap-1 sm:gap-2 order-1 sm:order-2">
                {/* First Page Button - Hidden on small mobile */}
                <button
                  onClick={() => handlePageChange(1)}
                  disabled={currentPage === 1}
                  className={`hidden xs:block p-1.5 sm:p-2 rounded-lg transition-colors ${
                    currentPage === 1
                      ? "bg-stone-200 text-stone-400 cursor-not-allowed"
                      : "bg-white hover:bg-lime-100 text-stone-700 border border-stone-300"
                  }`}
                >
                  <MdFirstPage size={18} className="sm:w-5 sm:h-5" />
                </button>

                {/* Previous Page Button */}
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`p-1.5 sm:p-2 rounded-lg transition-colors ${
                    currentPage === 1
                      ? "bg-stone-200 text-stone-400 cursor-not-allowed"
                      : "bg-white hover:bg-lime-100 text-stone-700 border border-stone-300"
                  }`}
                >
                  <MdChevronLeft size={18} className="sm:w-5 sm:h-5" />
                </button>

                {/* Page Numbers - Simplified on mobile */}
                <div className="flex gap-1">
                  {getVisiblePages()
                    .slice(0, 3)
                    .map((page) => (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={`px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                          currentPage === page
                            ? "bg-lime-400 text-stone-700"
                            : "bg-white hover:bg-lime-100 text-stone-700 border border-stone-300"
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                </div>

                {/* Next Page Button */}
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className={`p-1.5 sm:p-2 rounded-lg transition-colors ${
                    currentPage === totalPages
                      ? "bg-stone-200 text-stone-400 cursor-not-allowed"
                      : "bg-white hover:bg-lime-100 text-stone-700 border border-stone-300"
                  }`}
                >
                  <MdChevronRight size={18} className="sm:w-5 sm:h-5" />
                </button>

                {/* Last Page Button - Hidden on small mobile */}
                <button
                  onClick={() => handlePageChange(totalPages)}
                  disabled={currentPage === totalPages}
                  className={`hidden xs:block p-1.5 sm:p-2 rounded-lg transition-colors ${
                    currentPage === totalPages
                      ? "bg-stone-200 text-stone-400 cursor-not-allowed"
                      : "bg-white hover:bg-lime-100 text-stone-700 border border-stone-300"
                  }`}
                >
                  <MdLastPage size={18} className="sm:w-5 sm:h-5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PayrollSystem;
