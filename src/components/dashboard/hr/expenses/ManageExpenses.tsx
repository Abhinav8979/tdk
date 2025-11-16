"use client";
import {
  useGetEmployeeExpenses,
  usePostEmployeeExpenses,
} from "@/hooks/RTKHooks";
import { EmployeeExpenses } from "@/types/hrDashboard.types";
import {
  exportToExcelExpenses,
  exportToPDFExpenses,
} from "@/utils/ExportFunction";
import React, { useState, useEffect } from "react";
import {
  FaFilePdf,
  FaFileExcel,
  FaCalendarAlt,
  FaChevronLeft,
  FaChevronRight,
  FaSearch,
  FaTimes,
  FaCalendarDay,
  FaCalendar,
  FaEdit,
  FaSave,
} from "react-icons/fa";
import { toast } from "react-toastify";

interface ApiEmployeeData {
  employeeId: string;
  email: string;
  username: string;
  storeId: string;
  storeName: string;
  expenses: {
    initialReading: number;
    date: string;
    finalReading: number;
    totalDistance: number;
    rate: number;
    amount: number;
    miscellaneousExpense: number;
  }[];
}

interface RateOption {
  value: number;
  label: string;
}

interface ExpenseData {
  [date: string]: EmployeeExpenses[];
}

interface EditingState {
  [employeeId: string]: boolean;
}

interface ExpensePayload {
  employeeId: string;
  date: string;
  initialReading: number;
  finalReading: number;
  rate: number;
  miscellaneousExpense: number;
  storeName?: string;
}

type ViewType = "day" | "month";

// Utility function to ensure positive integers
const ensurePositiveInteger = (value: string | number): number => {
  const num =
    typeof value === "string" ? parseInt(value, 10) : Math.floor(value);
  return Math.max(0, isNaN(num) ? 0 : num);
};

// Utility function to validate and convert input values
const validateAndConvertInput = (
  value: string,
  fieldType: "integer" | "miscellaneous" = "integer"
): string => {
  const cleanValue = value.replace(/[^\d]/g, "");
  if (fieldType === "miscellaneous") {
    return cleanValue;
  }
  return cleanValue;
};

// Updated utility function to convert date to YYYY-MM-DD format
const dateToYMDFormat = (dateString: string): string => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return dateString;
  }

  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

// Utility functions for month navigation
const getMonthStartEnd = (dateString: string) => {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = date.getMonth();

  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 0);

  return {
    startDate: startDate.toLocaleDateString().split("T")[0],
    endDate: endDate.toLocaleDateString().split("T")[0],
  };
};

const navigateMonth = (
  dateString: string,
  direction: "prev" | "next"
): string => {
  const date = new Date(dateString);
  const currentMonth = date.getMonth();
  const currentYear = date.getFullYear();

  if (direction === "prev") {
    date.setMonth(currentMonth - 1);
  } else {
    date.setMonth(currentMonth + 1);
  }

  return date.toISOString().split("T")[0];
};

const navigateDay = (
  dateString: string,
  direction: "prev" | "next"
): string => {
  const date = new Date(dateString);

  if (direction === "prev") {
    date.setDate(date.getDate() - 1);
  } else {
    date.setDate(date.getDate() + 1);
  }

  return date.toISOString().split("T")[0];
};

const rateOptions: RateOption[] = [
  { value: 1.4, label: "1.4" },
  { value: 1.0, label: "1.0" },
  { value: 0.9, label: "0.9" },
  { value: 1.2, label: "1.2" },
];

const ManageExpenses = ({ storeName }: { storeName: string }) => {
  const [viewType, setViewType] = useState<ViewType>("day");
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [expenses, setExpenses] = useState<ExpenseData>({});
  const [editingEmployees, setEditingEmployees] = useState<EditingState>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const recordsPerPage = 10;

  // Calculate date range based on view type
  const getDateRange = () => {
    if (viewType === "month") {
      return getMonthStartEnd(selectedDate);
    } else {
      return {
        startDate: selectedDate,
        endDate: selectedDate,
      };
    }
  };

  const { startDate, endDate } = getDateRange();

  const { data: employeeData, isPending } = useGetEmployeeExpenses({
    allEmployees: "true",
    startDate,
    endDate,
    storeName: storeName,
  });

  const { mutate: employeeExpenses } = usePostEmployeeExpenses();

  useEffect(() => {
    if (employeeData && Array.isArray(employeeData)) {
      if (viewType === "day") {
        // Day view logic (existing)
        const dateKey = selectedDate;
        const transformedExpenses: EmployeeExpenses[] = employeeData.map(
          (apiEmployee: ApiEmployeeData) => ({
            id: `${apiEmployee.employeeId}-${dateKey}`,
            employeeId: apiEmployee.employeeId,
            employeeName: apiEmployee.username,
            email: apiEmployee.email,
            storeName: apiEmployee.storeName,
            initialReading: ensurePositiveInteger(
              apiEmployee.expenses[0]?.initialReading ?? 0
            ).toString(),
            finalReading: ensurePositiveInteger(
              apiEmployee.expenses.length <= 1
                ? apiEmployee.expenses[0]?.finalReading ?? 0
                : apiEmployee.expenses[0].finalReading
            ).toString(),
            rate:
              apiEmployee.expenses.length <= 1
                ? apiEmployee.expenses[0]?.rate ?? 1.4
                : apiEmployee.expenses[0].rate,
            date: dateKey,
            miscellaneousExpense: ensurePositiveInteger(
              apiEmployee.expenses.length <= 1
                ? apiEmployee.expenses[0]?.miscellaneousExpense ?? 0
                : apiEmployee.expenses[0].miscellaneousExpense
            ),
            isUpdatedOnce: apiEmployee.expenses.length > 0,
          })
        );

        setExpenses((prev) => ({
          ...prev,
          [dateKey]: transformedExpenses,
        }));
      } else {
        // Month view logic - aggregate all expenses for the month
        const monthKey = `${selectedDate.substring(0, 7)}-month`;
        const transformedExpenses: EmployeeExpenses[] = employeeData.map(
          (apiEmployee: ApiEmployeeData) => {
            // Aggregate all expenses for this employee in the month
            let totalInitialReading = 0;
            let totalFinalReading = 0;
            let totalMiscellaneous = 0;
            let totalAmount = 0;
            let expenseCount = 0;
            let avgRate = 0;

            apiEmployee.expenses.forEach((expense) => {
              totalInitialReading += ensurePositiveInteger(
                expense.initialReading
              );
              totalFinalReading += ensurePositiveInteger(expense.finalReading);
              totalMiscellaneous += ensurePositiveInteger(
                expense.miscellaneousExpense
              );
              totalAmount += ensurePositiveInteger(expense.amount);
              avgRate += expense.rate;
              expenseCount++;
            });

            avgRate = expenseCount > 0 ? avgRate / expenseCount : 1.4;

            return {
              id: `${apiEmployee.employeeId}-${monthKey}`,
              employeeId: apiEmployee.employeeId,
              employeeName: apiEmployee.username,
              email: apiEmployee.email,
              storeName: apiEmployee.storeName,
              initialReading: totalInitialReading.toString(),
              finalReading: totalFinalReading.toString(),
              rate: avgRate,
              date: monthKey,
              miscellaneousExpense: totalMiscellaneous,
              isUpdatedOnce: apiEmployee.expenses.length > 0,
            };
          }
        );

        setExpenses((prev) => ({
          ...prev,
          [monthKey]: transformedExpenses,
        }));
      }
    }
  }, [selectedDate, employeeData, viewType]);

  // Reset to first page when date changes, search term changes, or view changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedDate, searchTerm, viewType]);

  const getCurrentDateExpenses = (): EmployeeExpenses[] => {
    const key =
      viewType === "month"
        ? `${selectedDate.substring(0, 7)}-month`
        : selectedDate;
    return expenses[key] || [];
  };

  // Filter employees based on search term
  const getFilteredExpenses = (): EmployeeExpenses[] => {
    const currentExpenses = getCurrentDateExpenses();

    if (!searchTerm.trim()) {
      return currentExpenses;
    }

    const searchTermLower = searchTerm.toLowerCase().trim();

    return currentExpenses.filter((employee) => {
      const employeeName = employee.employeeName?.toLowerCase() || "";
      const email = employee.email?.toLowerCase() || "";
      const storeName = employee.storeName?.toLowerCase() || "";

      return (
        employeeName.includes(searchTermLower) ||
        email.includes(searchTermLower) ||
        storeName.includes(searchTermLower)
      );
    });
  };

  // Pagination calculations with filtered data
  const filteredExpenses = getFilteredExpenses();
  const totalRecords = filteredExpenses.length;
  const totalPages = Math.ceil(totalRecords / recordsPerPage);
  const startIndex = (currentPage - 1) * recordsPerPage;
  const endIndex = startIndex + recordsPerPage;
  const currentRecords = filteredExpenses.slice(startIndex, endIndex);

  const calculateTotalUsage = (initial: string, final: string): number => {
    const initialNum = ensurePositiveInteger(initial);
    const finalNum = ensurePositiveInteger(final);
    return Math.max(0, finalNum - initialNum);
  };

  const calculateTotalAmount = (
    initial: string,
    final: string,
    rate: number
  ): number => {
    const usage = calculateTotalUsage(initial, final);
    return usage * rate;
  };

  const calculateFinalAmount = (
    initial: string,
    final: string,
    rate: number,
    miscellaneous: number = 0
  ): number => {
    const totalAmount = calculateTotalAmount(initial, final, rate);
    const miscellaneousAmount = ensurePositiveInteger(miscellaneous);
    return totalAmount + miscellaneousAmount;
  };

  const handleCellEdit = (
    employeeId: string,
    field: keyof EmployeeExpenses,
    value: string | number
  ): void => {
    // Only allow editing in day view
    if (viewType !== "day") return;

    let processedValue: string | number = value;

    if (field === "initialReading" || field === "finalReading") {
      processedValue = validateAndConvertInput(value.toString(), "integer");
    } else if (field === "miscellaneousExpense") {
      const cleanValue = validateAndConvertInput(
        value.toString(),
        "miscellaneous"
      );
      processedValue = ensurePositiveInteger(cleanValue);
    }

    setExpenses((prev) => ({
      ...prev,
      [selectedDate]: prev[selectedDate].map((emp) =>
        emp.id === employeeId ? { ...emp, [field]: processedValue } : emp
      ),
    }));
  };

  const handleEditEmployee = (employeeId: string): void => {
    if (viewType !== "day") return;

    setEditingEmployees((prev) => ({
      ...prev,
      [employeeId]: true,
    }));
  };

  const handleSaveEmployee = (
    employeeId: string,
    isUpdatedOnce: boolean
  ): void => {
    if (viewType !== "day") return;

    const employeeToSave = getCurrentDateExpenses().find(
      (emp) => emp.id === employeeId
    );

    if (!employeeToSave) {
      toast.error("Employee not found for saving");
      return;
    }

    const initialReading = ensurePositiveInteger(employeeToSave.initialReading);
    const finalReading = ensurePositiveInteger(employeeToSave.finalReading);
    const miscellaneousExpense = ensurePositiveInteger(
      employeeToSave.miscellaneousExpense
    );

    const httpMethod = !isUpdatedOnce ? "POST" : "PUT";

    const payload: ExpensePayload = {
      employeeId: employeeToSave.employeeId,
      date: dateToYMDFormat(selectedDate),
      initialReading: initialReading,
      finalReading: finalReading,
      rate: employeeToSave.rate,
      miscellaneousExpense: miscellaneousExpense,
    };

    employeeExpenses(
      { type: httpMethod, payload: payload },
      {
        onSuccess: () => {
          toast.success("Expenses updated successfully!");
          setEditingEmployees((prev) => {
            const newState = { ...prev };
            delete newState[employeeId];
            return newState;
          });
        },
        onError: (error) => {
          toast.error("Failed to save employee expense");
          console.error("Failed to save employee expense:", error);
        },
      }
    );
  };

  const handleResetEmployee = (employeeId: string): void => {
    if (viewType !== "day") return;

    const originalEmployee = employeeData?.find(
      (emp: ApiEmployeeData) =>
        `${emp.employeeId}-${selectedDate}` === employeeId
    );

    if (originalEmployee) {
      setExpenses((prev) => ({
        ...prev,
        [selectedDate]: prev[selectedDate].map((emp) =>
          emp.id === employeeId
            ? {
                ...emp,
                initialReading: ensurePositiveInteger(
                  originalEmployee.expenses.initialReading
                ).toString(),
                finalReading: ensurePositiveInteger(
                  originalEmployee.expenses.finalReading
                ).toString(),
                rate: originalEmployee.expenses.rate || 1.4,
                miscellaneousExpense: ensurePositiveInteger(
                  originalEmployee.expenses.miscellaneousExpense || 0
                ),
              }
            : emp
        ),
      }));
    }

    setEditingEmployees((prev) => {
      const newState = { ...prev };
      delete newState[employeeId];
      return newState;
    });
  };

  const handleNavigation = (direction: "prev" | "next"): void => {
    if (viewType === "month") {
      setSelectedDate(navigateMonth(selectedDate, direction));
    } else {
      setSelectedDate(navigateDay(selectedDate, direction));
    }
  };

  const handleExportToPDF = (): void => {
    exportToPDFExpenses(filteredExpenses, viewType, selectedDate);
  };

  const handleExportToExcel = (): void => {
    exportToExcelExpenses(filteredExpenses, viewType, selectedDate);
  };

  const formatDate = (dateString: string): string => {
    if (viewType === "month") {
      return new Date(dateString).toLocaleDateString("en-IN", {
        year: "numeric",
        month: "long",
      });
    } else {
      return new Date(dateString).toLocaleDateString("en-IN", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    }
  };

  const handlePageChange = (page: number): void => {
    setCurrentPage(page);
  };

  const handlePreviousPage = (): void => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = (): void => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handleClearSearch = (): void => {
    setSearchTerm("");
  };

  const renderPaginationButtons = () => {
    const buttons = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage < maxVisiblePages - 1) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      buttons.push(
        <button
          key={i}
          onClick={() => handlePageChange(i)}
          className={`px-4 py-2 mx-1 rounded-lg font-medium transition-all duration-300 ${
            currentPage === i
              ? "text-white shadow-lg transform scale-105"
              : "text-gray-600 hover:text-white hover:shadow-md hover:transform hover:scale-105"
          }`}
          style={{
            backgroundColor: currentPage === i ? "#b4ca01" : "#e4ecaa",
          }}
        >
          {i}
        </button>
      );
    }

    return buttons;
  };

  const renderEditableCell = (
    employee: EmployeeExpenses,
    field: "initialReading" | "finalReading" | "rate" | "miscellaneousExpense",
    type: "text" | "number" | "select" = "text"
  ) => {
    const isEmployeeEditing =
      editingEmployees[employee.id] && viewType === "day";
    const value = employee[field];
    const isReadOnly = viewType === "month";

    if (type === "select") {
      return (
        <select
          value={value}
          onChange={(e) =>
            handleCellEdit(employee.id, field, parseFloat(e.target.value))
          }
          disabled={!isEmployeeEditing || isReadOnly}
          className={`w-full 
              p-1.5 sm:p-2.5 md:p-3 
              rounded-md sm:rounded-lg
              text-center 
              text-xs sm:text-sm md:text-base 
              font-medium 
              transition-all duration-300 
              text-black
              ${
                isEmployeeEditing && !isReadOnly
                  ? "border-2 border-blue-400 bg-white shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  : "bg-gray-50 border border-gray-200 cursor-not-allowed opacity-70"
              }`}
          style={{ minWidth: "60px" }} // smaller for mobile
        >
          {rateOptions.map((option) => (
            <option
              key={option.value}
              value={option.value}
              className="text-black"
            >
              {option.label}
            </option>
          ))}
        </select>
      );
    }

    return (
      <input
        type="number"
        value={value}
        onChange={(e) => handleCellEdit(employee.id, field, e.target.value)}
        disabled={!isEmployeeEditing || isReadOnly}
        className={`w-1/2
              p-1.5 sm:p-2.5 md:p-3 
              rounded-md sm:rounded-lg
              text-center 
              text-xs sm:text-sm md:text-base 
              font-medium 
              transition-all duration-300 
              text-black
              ${
                isEmployeeEditing && !isReadOnly
                  ? "border-2 border-blue-400 bg-white shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  : "bg-gray-50 border border-gray-200 cursor-not-allowed opacity-70"
              }`}
        placeholder="0"
        min="0"
        step="1"
        style={{ minWidth: "60px" }} // compact for mobile
        onKeyDown={(e) => {
          if (
            field === "miscellaneousExpense" ||
            field === "initialReading" ||
            field === "finalReading"
          ) {
            // block decimal, negative, scientific keys
            if (
              e.key === "." ||
              e.key === "-" ||
              e.key === "e" ||
              e.key === "E"
            ) {
              e.preventDefault();
            }
          }
        }}
      />
    );
  };

  if (isPending) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "#fafcf0" }}
      >
        <div className="text-center">
          <div
            className="animate-spin rounded-full h-32 w-32 border-b-2 mx-auto mb-4"
            style={{ borderColor: "#b4ca01" }}
          ></div>
          <h1 className="text-2xl font-semibold" style={{ color: "#2c2c2c" }}>
            Loading...
          </h1>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen font-sans"
      style={{ backgroundColor: "#fafcf0" }}
    >
      <div className=" mx-auto">
        {/* Controls Section */}
        <div
          className="rounded-2xl p-4 sm:p-6 shadow-lg border mb-8"
          style={{ backgroundColor: "#fafcf0", borderColor: "#e4ecaa" }}
        >
          {/* View Type Toggle */}
          <div className="flex justify-center mb-6">
            <div
              className="flex rounded-xl p-1"
              style={{ backgroundColor: "#e4ecaa" }}
            >
              <button
                onClick={() => setViewType("day")}
                className={`px-6 py-3 rounded-lg font-semibold flex items-center gap-2 transition-all duration-300 ${
                  viewType === "day"
                    ? "text-white shadow-lg"
                    : "text-gray-600 hover:text-gray-800"
                }`}
                style={{
                  backgroundColor:
                    viewType === "day" ? "#b4ca01" : "transparent",
                }}
              >
                <FaCalendarDay />
                Day View
              </button>
              <button
                onClick={() => setViewType("month")}
                className={`px-6 py-3 rounded-lg font-semibold flex items-center gap-2 transition-all duration-300 ${
                  viewType === "month"
                    ? "text-white shadow-lg"
                    : "text-gray-600 hover:text-gray-800"
                }`}
                style={{
                  backgroundColor:
                    viewType === "month" ? "#b4ca01" : "transparent",
                }}
              >
                <FaCalendar />
                Month View
              </button>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 w-full">
            {/* Date Selection with Navigation */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full lg:w-auto">
              <div
                className="p-2.5 sm:p-3 rounded-full shrink-0 flex items-center justify-center"
                style={{ backgroundColor: "#e4ecaa" }}
              >
                <FaCalendarAlt
                  className="text-base sm:text-lg"
                  style={{ color: "#b4ca01" }}
                />
              </div>

              <div className="flex-1 w-full">
                <label
                  className="block font-semibold mb-1 sm:mb-2 text-sm sm:text-base"
                  style={{ color: "#2c2c2c" }}
                >
                  {viewType === "day" ? "Select Date" : "Select Month"}
                </label>

                <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
                  <button
                    onClick={() => handleNavigation("prev")}
                    className="p-2 sm:p-2.5 rounded-lg border-2 hover:shadow-md transition-all text-sm sm:text-base"
                    style={{
                      backgroundColor: "#fafcf0",
                      borderColor: "#e4ecaa",
                      color: "#b4ca01",
                    }}
                  >
                    <FaChevronLeft />
                  </button>

                  <input
                    type={viewType === "day" ? "date" : "month"}
                    value={
                      viewType === "day"
                        ? selectedDate
                        : selectedDate.substring(0, 7)
                    }
                    onChange={(e) => {
                      if (viewType === "day") {
                        setSelectedDate(e.target.value);
                      } else {
                        setSelectedDate(e.target.value + "-01");
                      }
                    }}
                    className="p-2.5 sm:p-3 border-2 rounded-lg text-sm sm:text-base w-full focus:ring-2 transition-all"
                    style={{
                      backgroundColor: "#fafcf0",
                      color: "#2c2c2c",
                      borderColor: "#e4ecaa",
                    }}
                  />

                  <button
                    onClick={() => handleNavigation("next")}
                    className="p-2 sm:p-2.5 rounded-lg border-2 hover:shadow-md transition-all text-sm sm:text-base"
                    style={{
                      backgroundColor: "#fafcf0",
                      borderColor: "#e4ecaa",
                      color: "#b4ca01",
                    }}
                  >
                    <FaChevronRight />
                  </button>
                </div>

                <div
                  className="text-xs sm:text-sm mt-1 sm:mt-2"
                  style={{ color: "#666" }}
                >
                  {formatDate(selectedDate)}
                </div>
              </div>
            </div>

            {/* Search Section */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full lg:w-auto">
              <div
                className="p-2.5 sm:p-3 rounded-full shrink-0 flex items-center justify-center"
                style={{ backgroundColor: "#e4ecaa" }}
              >
                <FaSearch
                  className="text-base sm:text-lg"
                  style={{ color: "#b4ca01" }}
                />
              </div>

              <div className="relative flex-1 w-full">
                <label
                  className="block font-semibold mb-1 sm:mb-2 text-sm sm:text-base"
                  style={{ color: "#2c2c2c" }}
                >
                  Search Employee
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search by name, email, or store..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="p-2.5 sm:p-3 pr-9 border-2 rounded-lg text-sm sm:text-base w-full focus:ring-2 transition-all"
                    style={{
                      backgroundColor: "#fafcf0",
                      color: "#2c2c2c",
                      borderColor: "#e4ecaa",
                    }}
                  />
                  {searchTerm && (
                    <button
                      onClick={handleClearSearch}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <FaTimes size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Export Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
              <button
                onClick={handleExportToPDF}
                className="w-full sm:w-auto text-white px-4 py-2 sm:px-6 sm:py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl text-sm sm:text-base"
                style={{ backgroundColor: "#b4ca01" }}
              >
                <FaFilePdf size={16} />
                PDF
              </button>

              <button
                onClick={handleExportToExcel}
                className="w-full sm:w-auto text-white px-4 py-2 sm:px-6 sm:py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl text-sm sm:text-base"
                style={{ backgroundColor: "#b4ca01" }}
              >
                <FaFileExcel size={16} />
                Excel
              </button>
            </div>
          </div>
        </div>

        {/* Main Table */}
        <div
          className="rounded-xl sm:rounded-2xl shadow-lg border overflow-hidden"
          style={{ backgroundColor: "#fafcf0", borderColor: "#e4ecaa" }}
        >
          {/* Header */}
          <div
            className="p-3 sm:p-6 text-white"
            style={{
              background: "linear-gradient(135deg, #b4ca01 0%, #8ba000 100%)",
            }}
          >
            <div className="flex flex-col gap-2">
              <h2 className="text-base sm:text-xl lg:text-2xl font-bold">
                Employee Expense Records {viewType === "month" && "(Read-Only)"}
              </h2>
              <div className="text-xs sm:text-sm opacity-90">
                Page {currentPage} of {totalPages} | {startIndex + 1}-
                {Math.min(endIndex, totalRecords)} of {totalRecords}
              </div>
            </div>
          </div>

          {totalRecords === 0 ? (
            <div className="p-8 sm:p-12 text-center">
              <FaSearch
                className="mx-auto text-4xl sm:text-6xl mb-4 opacity-20"
                style={{ color: "#b4ca01" }}
              />
              <div
                className="text-lg sm:text-xl font-semibold mb-2"
                style={{ color: "#2c2c2c" }}
              >
                {searchTerm ? "No employees found" : "No data available"}
              </div>
              <div
                className="text-xs sm:text-sm opacity-70"
                style={{ color: "#2c2c2c" }}
              >
                {searchTerm
                  ? "Try adjusting your search criteria"
                  : `No employee data available for the selected ${viewType}`}
              </div>
            </div>
          ) : (
            <>
              {/* Desktop Table View (hidden on mobile) */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr style={{ backgroundColor: "#f8faf2" }}>
                      <th
                        className="p-4 text-left font-semibold text-sm"
                        style={{ color: "#2c2c2c" }}
                      >
                        Employee Details
                      </th>
                      {viewType === "day" && (
                        <>
                          <th
                            className="p-4 text-center font-semibold text-sm"
                            style={{ color: "#2c2c2c" }}
                          >
                            Initial Reading
                          </th>
                          <th
                            className="p-4 text-center font-semibold text-sm"
                            style={{ color: "#2c2c2c" }}
                          >
                            Final Reading
                          </th>
                          <th
                            className="p-4 text-center font-semibold text-sm"
                            style={{ color: "#2c2c2c" }}
                          >
                            Total Usage (KM)
                          </th>
                          <th
                            className="p-4 text-center font-semibold text-sm"
                            style={{ color: "#2c2c2c" }}
                          >
                            Rate
                          </th>
                        </>
                      )}
                      <th
                        className="p-4 text-center font-semibold text-sm"
                        style={{ color: "#2c2c2c" }}
                      >
                        {viewType === "day" ? "Amount" : "Monthly Amount"}
                      </th>
                      <th
                        className="p-4 text-center font-semibold text-sm"
                        style={{ color: "#2c2c2c" }}
                      >
                        {viewType === "day" ? "Miscellaneous" : "Monthly Misc."}
                      </th>
                      <th
                        className="p-4 text-center font-semibold text-sm"
                        style={{ color: "#2c2c2c" }}
                      >
                        {viewType === "day" ? "Final Amount" : "Monthly Final"}
                      </th>
                      {viewType === "day" && (
                        <th
                          className="p-4 text-center font-semibold text-sm"
                          style={{ color: "#2c2c2c" }}
                        >
                          Actions
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {currentRecords.map((employee, index) => {
                      const isEditing =
                        editingEmployees[employee.id] && viewType === "day";
                      const totalUsage = calculateTotalUsage(
                        employee.initialReading,
                        employee.finalReading
                      );
                      const totalAmount = calculateTotalAmount(
                        employee.initialReading,
                        employee.finalReading,
                        employee.rate
                      );
                      const finalAmount = calculateFinalAmount(
                        employee.initialReading,
                        employee.finalReading,
                        employee.rate,
                        employee.miscellaneousExpense
                      );

                      return (
                        <tr
                          key={employee.id}
                          className={`border-b transition-all ${
                            index % 2 === 0 ? "bg-white" : ""
                          } ${
                            isEditing
                              ? "ring-2 ring-blue-200 bg-blue-50"
                              : "hover:bg-gray-50"
                          }`}
                          style={{ borderColor: "#e4ecaa" }}
                        >
                          <td className="p-4">
                            <div
                              className="font-semibold text-sm"
                              style={{ color: "#2c2c2c" }}
                            >
                              {employee.employeeName}
                            </div>
                            <div className="text-xs text-gray-500">
                              {employee.email}
                            </div>
                            <div
                              className="text-xs font-medium"
                              style={{ color: "#b4ca01" }}
                            >
                              {employee.storeName}
                            </div>
                          </td>
                          {viewType === "day" && (
                            <>
                              <td className="p-4 text-center">
                                <div className="p-2 rounded bg-gray-50  text-sm">
                                  {isEditing
                                    ? renderEditableCell(
                                        employee,
                                        "initialReading",
                                        "number"
                                      )
                                    : employee.initialReading}
                                </div>
                              </td>
                              <td className="p-4 text-center">
                                <div className="p-2 rounded bg-gray-50  text-sm">
                                  {isEditing
                                    ? renderEditableCell(
                                        employee,
                                        "finalReading",
                                        "number"
                                      )
                                    : employee.finalReading}
                                </div>
                              </td>
                              <td className="p-4 text-center">
                                <div className="p-2 rounded bg-gray-50  font-medium text-sm">
                                  {totalUsage.toLocaleString()} KM
                                </div>
                              </td>
                              <td className="p-4 text-center">
                                <div className="p-2 rounded bg-gray-50  text-sm">
                                  ₹
                                  {isEditing
                                    ? renderEditableCell(
                                        employee,
                                        "rate",
                                        "select"
                                      )
                                    : employee.rate}
                                </div>
                              </td>
                            </>
                          )}
                          <td className="p-4 text-center">
                            <div className="p-2 rounded bg-gray-50  font-medium text-sm">
                              ₹{totalAmount.toFixed(2)}
                            </div>
                          </td>
                          <td className="p-4 text-center">
                            <div className="p-2 rounded bg-gray-50  text-sm">
                              ₹
                              {isEditing
                                ? renderEditableCell(
                                    employee,
                                    "miscellaneousExpense",
                                    "number"
                                  )
                                : employee.miscellaneousExpense}
                            </div>
                          </td>
                          <td className="p-4 text-center">
                            <div
                              className="p-2 rounded font-bold text-sm text-white"
                              style={{ backgroundColor: "#b4ca01" }}
                            >
                              ₹{finalAmount.toFixed(2)}
                            </div>
                          </td>
                          {viewType === "day" && (
                            <td className="p-4">
                              <div className="flex gap-2">
                                {!isEditing ? (
                                  <button
                                    onClick={() =>
                                      handleEditEmployee(employee.id)
                                    }
                                    className="px-3 py-1.5 text-white rounded-lg text-sm hover:scale-105 transition-all"
                                    style={{ backgroundColor: "#b4ca01" }}
                                  >
                                    Edit
                                  </button>
                                ) : (
                                  <>
                                    <button
                                      onClick={() =>
                                        handleSaveEmployee(
                                          employee.id,
                                          employee.isUpdatedOnce
                                        )
                                      }
                                      className="px-3 py-1.5 bg-green-500 text-white rounded-lg text-sm hover:scale-105 transition-all"
                                    >
                                      Save
                                    </button>
                                    <button
                                      onClick={() =>
                                        handleResetEmployee(employee.id)
                                      }
                                      className="px-3 py-1.5 bg-gray-500 text-white rounded-lg text-sm hover:scale-105 transition-all"
                                    >
                                      Cancel
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View (visible on mobile only) */}
              <div className="lg:hidden space-y-3 p-3">
                {currentRecords.map((employee) => {
                  const isEditing =
                    editingEmployees[employee.id] && viewType === "day";
                  const totalUsage = calculateTotalUsage(
                    employee.initialReading,
                    employee.finalReading
                  );
                  const totalAmount = calculateTotalAmount(
                    employee.initialReading,
                    employee.finalReading,
                    employee.rate
                  );
                  const finalAmount = calculateFinalAmount(
                    employee.initialReading,
                    employee.finalReading,
                    employee.rate,
                    employee.miscellaneousExpense
                  );

                  return (
                    <div
                      key={employee.id}
                      className={`bg-white rounded-lg shadow-md overflow-hidden ${
                        isEditing ? "ring-2 ring-blue-300" : ""
                      }`}
                    >
                      {/* Employee Header */}
                      <div
                        className="p-3 border-b"
                        style={{
                          borderColor: "#e4ecaa",
                          backgroundColor: "#f8faf2",
                        }}
                      >
                        <div
                          className="font-semibold text-sm"
                          style={{ color: "#2c2c2c" }}
                        >
                          {employee.employeeName}
                        </div>
                        <div className="text-xs text-gray-500">
                          {employee.email}
                        </div>
                        <div
                          className="text-xs font-medium mt-1"
                          style={{ color: "#b4ca01" }}
                        >
                          {employee.storeName}
                        </div>
                      </div>

                      {/* Employee Details */}
                      <div className="p-3 space-y-2 text-sm">
                        {viewType === "day" && (
                          <>
                            <div className="flex justify-between items-center">
                              <span className="text-gray-600">
                                Initial Reading:
                              </span>
                              <span className="font-medium">
                                {isEditing
                                  ? renderEditableCell(
                                      employee,
                                      "initialReading",
                                      "number"
                                    )
                                  : employee.initialReading}{" "}
                                KM
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-gray-600">
                                Final Reading:
                              </span>
                              <span className="font-medium">
                                {isEditing
                                  ? renderEditableCell(
                                      employee,
                                      "finalReading",
                                      "number"
                                    )
                                  : employee.finalReading}{" "}
                                KM
                              </span>
                            </div>
                            <div
                              className="flex justify-between items-center py-2 border-t border-b"
                              style={{ borderColor: "#e4ecaa" }}
                            >
                              <span className="text-gray-600 font-medium">
                                Total Usage:
                              </span>
                              <span
                                className="font-bold"
                                style={{ color: "#b4ca01" }}
                              >
                                {totalUsage.toLocaleString()} KM
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-gray-600">Rate:</span>
                              <span className="font-medium">
                                ₹
                                {isEditing
                                  ? renderEditableCell(
                                      employee,
                                      "rate",
                                      "select"
                                    )
                                  : employee.rate}
                                /KM
                              </span>
                            </div>
                          </>
                        )}
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">
                            {viewType === "day" ? "Amount" : "Monthly Amount"}:
                          </span>
                          <span className="font-medium">
                            ₹{totalAmount.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Miscellaneous:</span>
                          <span className="font-medium">
                            ₹{employee.miscellaneousExpense}
                          </span>
                        </div>
                        <div
                          className="flex justify-between items-center pt-2 border-t"
                          style={{ borderColor: "#e4ecaa" }}
                        >
                          <span
                            className="font-semibold"
                            style={{ color: "#2c2c2c" }}
                          >
                            Final Amount:
                          </span>
                          <span
                            className="font-bold text-lg text-white px-3 py-1 rounded"
                            style={{ backgroundColor: "#b4ca01" }}
                          >
                            ₹{finalAmount.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      {viewType === "day" && (
                        <div
                          className="p-3 border-t"
                          style={{
                            borderColor: "#e4ecaa",
                            backgroundColor: "#f8faf2",
                          }}
                        >
                          {!isEditing ? (
                            <button
                              onClick={() => handleEditEmployee(employee.id)}
                              className="w-full py-2 text-white rounded-lg font-medium text-sm flex items-center justify-center gap-2"
                              style={{ backgroundColor: "#b4ca01" }}
                            >
                              <FaEdit /> Edit
                            </button>
                          ) : (
                            <div className="flex gap-2">
                              <button
                                onClick={() =>
                                  handleSaveEmployee(
                                    employee.id,
                                    employee.isUpdatedOnce
                                  )
                                }
                                className="flex-1 py-2 bg-green-500 text-white rounded-lg font-medium text-sm flex items-center justify-center gap-2"
                              >
                                <FaSave /> Save
                              </button>
                              <button
                                onClick={() => handleResetEmployee(employee.id)}
                                className="flex-1 py-2 bg-gray-500 text-white rounded-lg font-medium text-sm flex items-center justify-center gap-2"
                              >
                                <FaTimes /> Cancel
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div
                  className="p-3 sm:p-6 border-t flex flex-col sm:flex-row justify-between items-center gap-3"
                  style={{ borderColor: "#e4ecaa" }}
                >
                  <div
                    className="text-xs sm:text-sm"
                    style={{ color: "#2c2c2c" }}
                  >
                    Showing {startIndex + 1}-{Math.min(endIndex, totalRecords)}{" "}
                    of {totalRecords}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handlePreviousPage}
                      disabled={currentPage === 1}
                      className={`px-3 py-2 rounded-lg font-medium text-xs sm:text-sm transition-all flex items-center gap-1 ${
                        currentPage === 1
                          ? "opacity-50 cursor-not-allowed"
                          : "hover:shadow-md"
                      }`}
                      style={{ backgroundColor: "#e4ecaa", color: "#2c2c2c" }}
                    >
                      <FaChevronLeft size={12} />
                      <span className="hidden sm:inline">Previous</span>
                    </button>
                    <div className="flex items-center gap-1">
                      {renderPaginationButtons()}
                    </div>
                    <button
                      onClick={handleNextPage}
                      disabled={currentPage === totalPages}
                      className={`px-3 py-2 rounded-lg font-medium text-xs sm:text-sm transition-all flex items-center gap-1 ${
                        currentPage === totalPages
                          ? "opacity-50 cursor-not-allowed"
                          : "hover:shadow-md"
                      }`}
                      style={{ backgroundColor: "#e4ecaa", color: "#2c2c2c" }}
                    >
                      <span className="hidden sm:inline">Next</span>
                      <FaChevronRight size={12} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ManageExpenses;
