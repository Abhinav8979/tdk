"use client";

import React, { useState, useMemo, useCallback } from "react";
import {
  MdChevronLeft,
  MdChevronRight,
  MdSearch,
  MdDownload,
  MdDescription,
  MdCalendarToday,
  MdPeople,
  MdFilterList,
  MdFirstPage,
  MdLastPage,
  MdStore,
} from "react-icons/md";
import { useGetEmployeeAttendance } from "@/hooks/RTKHooks";
import {
  exportToExcelAttendance,
  exportToPDFAttendance,
} from "@/utils/ExportFunction";
import { useRouter } from "next/navigation";
import { useAppDispatch } from "@/hooks/ReduxSelector";
import { setLoading } from "@/redux/store/utils";

// Type definitions
interface AttendanceRecord {
  date: string;
  status: "present" | "absent" | "late" | "early_exit";
  lateEntryThreshold: number;
  earlyExitThreshold: number;
}

interface Employee {
  employeeId: string;
  email: string;
  username: string;
  storeId: string;
  storeName: string;
  attendance: AttendanceRecord[];
}

interface AttendanceSummary {
  total: number;
  present: number;
  absent: number;
  late: number;
  earlyExit: number;
}

interface ProcessedEmployee extends Employee {
  relevantAttendance: AttendanceRecord[];
  summary: AttendanceSummary;
}

type ViewMode = "day" | "month" | "year";
type StatusFilter = "all" | "present" | "absent" | "late" | "early_exit";

interface ApiDates {
  startDate: string;
  endDate: string;
}

interface PaginationConfig {
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
  totalPages: number;
}

interface StoreOption {
  storeId: string;
  storeName: string;
}

const AttendanceTable: React.FC = () => {
  // State management
  const [viewMode, setViewMode] = useState<ViewMode>("day");
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [storeFilter, setStoreFilter] = useState<string>("all");

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);

  const router = useRouter();
  const dispatch = useAppDispatch();

  const today = new Date(); // Today's date as reference

  // Calculate API dates based on view mode and current date
  const apiDates: ApiDates = useMemo(() => {
    const formatLocalDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    const start = new Date(currentDate);
    const end = new Date(currentDate);

    if (viewMode === "day") {
      // For day view, just that day
      return {
        startDate: formatLocalDate(start),
        endDate: formatLocalDate(end),
      };
    } else if (viewMode === "month") {
      // For month view, entire month
      start.setDate(1);
      end.setMonth(end.getMonth() + 1, 0);
      return {
        startDate: formatLocalDate(start),
        endDate: formatLocalDate(end),
      };
    } else {
      // For year view, entire year
      start.setMonth(0, 1);
      end.setMonth(11, 31);
      return {
        startDate: formatLocalDate(start),
        endDate: formatLocalDate(end),
      };
    }
  }, [currentDate, viewMode]);

  // API call
  const { data: allAttendance, isLoading } = useGetEmployeeAttendance({
    allEmployees: true,
    startDate: apiDates.startDate,
    endDate: apiDates.endDate,
  });

  // Custom colors
  const colors = {
    primary: "#b4ca01",
    foreground: "#2c2c2c",
    secondary: "#e4ecaa",
    tertiary: "#fafcf0",
  };

  // Extract unique stores from the data
  const storeOptions: StoreOption[] = useMemo(() => {
    if (!allAttendance || isLoading) return [];

    const uniqueStores = new Map<string, string>();
    allAttendance.forEach((employee: Employee) => {
      if (employee.storeId && employee.storeName) {
        uniqueStores.set(employee.storeId, employee.storeName);
      }
    });

    return Array.from(uniqueStores, ([storeId, storeName]) => ({
      storeId,
      storeName,
    })).sort((a, b) => a.storeName.localeCompare(b.storeName));
  }, [allAttendance, isLoading]);

  // Status badge colors
  const getStatusColor = (status: AttendanceRecord["status"]): string => {
    const statusColors: Record<AttendanceRecord["status"], string> = {
      present: "bg-green-100 text-green-800 border-green-200",
      absent: "bg-red-100 text-red-800 border-red-200",
      late: "bg-yellow-100 text-yellow-800 border-yellow-200",
      early_exit: "bg-orange-100 text-orange-800 border-orange-200",
    };
    return statusColors[status] || "bg-gray-100 text-gray-800 border-gray-200";
  };

  // Handle employee row click with navigation logic
  const handleEmployeeClick = useCallback(
    (employeeId: string) => {
      // Only navigate if view mode is year or month, not day
      if (viewMode === "day") {
        return; // Don't navigate for day view
      }

      // Create URL search params with start and end dates
      const searchParams = new URLSearchParams();
      searchParams.set("startDate", apiDates.startDate);
      searchParams.set("endDate", apiDates.endDate);
      searchParams.set("viewMode", viewMode);

      // Navigate to employee detail page with search params
      dispatch(setLoading(true));
      const url = `/dashboard/hr/attendance/${employeeId}?${searchParams.toString()}`;
      router.push(url);
    },
    [viewMode, apiDates, router]
  );

  // Navigation functions
  const navigatePrevious = useCallback(() => {
    const newDate = new Date(currentDate);
    if (viewMode === "day") {
      newDate.setDate(newDate.getDate() - 1);
    } else if (viewMode === "month") {
      newDate.setMonth(newDate.getMonth() - 1);
    } else if (viewMode === "year") {
      newDate.setFullYear(newDate.getFullYear() - 1);
    }
    setCurrentDate(newDate);
    setCurrentPage(1); // Reset to first page when date changes
  }, [currentDate, viewMode]);

  const navigateNext = useCallback(() => {
    const newDate = new Date(currentDate);
    if (viewMode === "day") {
      newDate.setDate(newDate.getDate() + 1);
    } else if (viewMode === "month") {
      newDate.setMonth(newDate.getMonth() + 1);
    } else if (viewMode === "year") {
      newDate.setFullYear(newDate.getFullYear() + 1);
    }

    // Check if new date is in the future
    if (newDate > today) return;

    setCurrentDate(newDate);
    setCurrentPage(1); // Reset to first page when date changes
  }, [currentDate, viewMode, today]);

  const canNavigateNext = useCallback((): boolean => {
    const newDate = new Date(currentDate);
    if (viewMode === "day") {
      newDate.setDate(newDate.getDate() + 1);
    } else if (viewMode === "month") {
      newDate.setMonth(newDate.getMonth() + 1);
    } else if (viewMode === "year") {
      newDate.setFullYear(newDate.getFullYear() + 1);
    }
    return newDate <= today;
  }, [currentDate, viewMode, today]);

  // Calculate summary
  const calculateSummary = useCallback(
    (attendance: AttendanceRecord[]): AttendanceSummary => {
      const total = attendance.length;
      const present = attendance.filter(
        (att) => att.status === "present"
      ).length;
      const absent = attendance.filter((att) => att.status === "absent").length;
      const late = attendance.filter((att) => att.status === "late").length;
      const earlyExit = attendance.filter(
        (att) => att.status === "early_exit"
      ).length;

      return { total, present, absent, late, earlyExit };
    },
    []
  );

  // Filter and format data based on view mode (without pagination)
  const filteredData: ProcessedEmployee[] = useMemo(() => {
    if (!allAttendance || isLoading) return [];

    let filteredData = allAttendance.filter((employee: Employee) => {
      // Search filter
      const matchesSearch =
        employee.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.email.toLowerCase().includes(searchTerm.toLowerCase());

      // Store filter
      const matchesStore =
        storeFilter === "all" || employee.storeId === storeFilter;

      return matchesSearch && matchesStore;
    });

    return filteredData.map((employee: Employee) => {
      let relevantAttendance = [...employee.attendance];

      // Apply status filter
      if (statusFilter !== "all") {
        relevantAttendance = relevantAttendance.filter(
          (att) => att.status === statusFilter
        );
      }

      return {
        ...employee,
        relevantAttendance,
        summary: calculateSummary(relevantAttendance),
      };
    });
  }, [
    allAttendance,
    isLoading,
    searchTerm,
    statusFilter,
    storeFilter,
    calculateSummary,
  ]);

  // Pagination calculations
  const paginationConfig: PaginationConfig = useMemo(() => {
    const totalItems = filteredData.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);

    return {
      currentPage,
      itemsPerPage,
      totalItems,
      totalPages,
    };
  }, [filteredData.length, itemsPerPage, currentPage]);

  // Get paginated data
  const paginatedData: ProcessedEmployee[] = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredData.slice(startIndex, endIndex);
  }, [filteredData, currentPage, itemsPerPage]);

  // Pagination handlers
  const goToPage = useCallback(
    (page: number) => {
      setCurrentPage(Math.max(1, Math.min(page, paginationConfig.totalPages)));
    },
    [paginationConfig.totalPages]
  );

  const goToFirstPage = useCallback(() => {
    setCurrentPage(1);
  }, []);

  const goToLastPage = useCallback(() => {
    setCurrentPage(paginationConfig.totalPages);
  }, [paginationConfig.totalPages]);

  const goToPreviousPage = useCallback(() => {
    setCurrentPage((prev) => Math.max(1, prev - 1));
  }, []);

  const goToNextPage = useCallback(() => {
    setCurrentPage((prev) => Math.min(paginationConfig.totalPages, prev + 1));
  }, [paginationConfig.totalPages]);

  // Format date display
  const formatDateDisplay = (): string => {
    const options: Record<ViewMode, Intl.DateTimeFormatOptions> = {
      day: { weekday: "long", year: "numeric", month: "long", day: "numeric" },
      month: { year: "numeric", month: "long" },
      year: { year: "numeric" },
    };
    return currentDate.toLocaleDateString("en-US", options[viewMode]);
  };

  // Handle view mode change
  const handleViewModeChange = (mode: ViewMode): void => {
    setViewMode(mode);
    setCurrentPage(1); // Reset to first page when view mode changes
  };

  // Handle search change
  const handleSearchChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ): void => {
    setSearchTerm(event.target.value);
    setCurrentPage(1); // Reset to first page when search changes
  };

  // Handle status filter change
  const handleStatusFilterChange = (
    event: React.ChangeEvent<HTMLSelectElement>
  ): void => {
    setStatusFilter(event.target.value as StatusFilter);
    setCurrentPage(1); // Reset to first page when filter changes
  };

  // Handle store filter change
  const handleStoreFilterChange = (
    event: React.ChangeEvent<HTMLSelectElement>
  ): void => {
    setStoreFilter(event.target.value);
    setCurrentPage(1); // Reset to first page when store filter changes
  };

  // Handle items per page change
  const handleItemsPerPageChange = (
    event: React.ChangeEvent<HTMLSelectElement>
  ): void => {
    const newItemsPerPage = parseInt(event.target.value);
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset to first page when items per page changes
  };

  // Generate page numbers for pagination
  const getPageNumbers = (): number[] => {
    const { currentPage, totalPages } = paginationConfig;
    const pageNumbers: number[] = [];

    if (totalPages <= 7) {
      // Show all pages if total pages <= 7
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      // Show first page, last page, current page and surrounding pages
      if (currentPage <= 4) {
        for (let i = 1; i <= 5; i++) {
          pageNumbers.push(i);
        }
        pageNumbers.push(-1); // Ellipsis
        pageNumbers.push(totalPages);
      } else if (currentPage >= totalPages - 3) {
        pageNumbers.push(1);
        pageNumbers.push(-1); // Ellipsis
        for (let i = totalPages - 4; i <= totalPages; i++) {
          pageNumbers.push(i);
        }
      } else {
        pageNumbers.push(1);
        pageNumbers.push(-1); // Ellipsis
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pageNumbers.push(i);
        }
        pageNumbers.push(-2); // Ellipsis
        pageNumbers.push(totalPages);
      }
    }

    return pageNumbers;
  };

  // Get selected store name for display
  const getSelectedStoreName = (): string => {
    if (storeFilter === "all") return "All Stores";
    const selectedStore = storeOptions.find(
      (store) => store.storeId === storeFilter
    );
    return selectedStore ? selectedStore.storeName : "All Stores";
  };

  if (isLoading) {
    return (
      <div
        className="min-h-screen p-6 flex items-center justify-center"
        style={{ backgroundColor: colors.tertiary }}
      >
        <div className="text-center">
          <div
            className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4"
            style={{ borderColor: colors.primary }}
          ></div>
          <p className="text-lg" style={{ color: colors.foreground }}>
            Loading attendance data...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen p-4 sm:p-6"
      style={{ backgroundColor: colors.tertiary }}
    >
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <h1
            className="text-2xl sm:text-3xl font-bold mb-2"
            style={{ color: colors.foreground }}
          >
            Employee Attendance Management
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            Track and manage employee attendance across different time periods
            {viewMode === "day" && (
              <span className="block sm:inline sm:ml-2 text-xs sm:text-sm text-orange-600 mt-1 sm:mt-0">
                (Click disabled in day view - switch to month or year view for
                detailed employee reports)
              </span>
            )}
          </p>
        </div>

        {/* Controls */}
        <div className="mb-4 sm:mb-6 space-y-3 sm:space-y-4">
          {/* View Mode Selector */}
          <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 sm:gap-4">
            <div className="flex bg-white rounded-lg p-1 shadow-sm border w-full sm:w-auto">
              {(["day", "month", "year"] as ViewMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => handleViewModeChange(mode)}
                  className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium capitalize transition-all flex items-center justify-center ${
                    viewMode === mode
                      ? "text-white shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                  style={
                    viewMode === mode ? { backgroundColor: colors.primary } : {}
                  }
                >
                  <MdCalendarToday className="mr-1 sm:mr-2 text-sm sm:text-base" />
                  <span className="hidden xs:inline">{mode} View</span>
                  <span className="xs:hidden">{mode}</span>
                </button>
              ))}
            </div>

            {/* Export Buttons */}
            <div className="flex gap-2 w-full sm:w-auto">
              <button
                onClick={() =>
                  exportToPDFAttendance(
                    filteredData,
                    "Employee_Attendance",
                    viewMode,
                    { startDate: apiDates.startDate, endDate: apiDates.endDate }
                  )
                }
                className="flex-1 sm:flex-none flex items-center justify-center px-3 sm:px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-xs sm:text-sm"
              >
                <MdDescription className="mr-1 sm:mr-2 text-sm sm:text-base" />
                <span className="hidden sm:inline">Export PDF</span>
                <span className="sm:hidden">PDF</span>
              </button>
              <button
                onClick={() =>
                  exportToExcelAttendance(
                    filteredData,
                    "Employee_Attendance",
                    viewMode,
                    {
                      startDate: apiDates.startDate,
                      endDate: apiDates.endDate,
                    }
                  )
                }
                className="flex-1 sm:flex-none flex items-center justify-center px-3 sm:px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-xs sm:text-sm"
              >
                <MdDownload className="mr-1 sm:mr-2 text-sm sm:text-base" />
                <span className="hidden sm:inline">Export Excel</span>
                <span className="sm:hidden">Excel</span>
              </button>
            </div>
          </div>

          {/* Search, Filter, and Items Per Page */}
          <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 sm:gap-4">
            <div className="relative w-full sm:flex-1 sm:min-w-64">
              <MdSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm sm:text-base" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={handleSearchChange}
                className="w-full pl-9 sm:pl-10 pr-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-20 focus:border-transparent outline-none"
                style={
                  {
                    "--tw-ring-color": colors.primary + "33",
                  } as React.CSSProperties
                }
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <MdStore className="text-sm sm:text-base text-gray-500" />
              <select
                value={storeFilter}
                onChange={handleStoreFilterChange}
                className="flex-1 sm:flex-none px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-20 focus:border-transparent outline-none sm:min-w-48"
                style={
                  {
                    "--tw-ring-color": colors.primary + "33",
                  } as React.CSSProperties
                }
              >
                <option value="all">All Stores</option>
                {storeOptions.map((store) => (
                  <option key={store.storeId} value={store.storeId}>
                    {store.storeName}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <MdFilterList className="text-sm sm:text-base text-gray-500" />
              <select
                value={statusFilter}
                onChange={handleStatusFilterChange}
                className="flex-1 sm:flex-none px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-20 focus:border-transparent outline-none"
                style={
                  {
                    "--tw-ring-color": colors.primary + "33",
                  } as React.CSSProperties
                }
              >
                <option value="all">All Status</option>
                <option value="present">Present</option>
                <option value="absent">Absent</option>
                <option value="late">Late</option>
                <option value="early_exit">Early Exit</option>
              </select>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs sm:text-sm text-gray-600">Show:</span>
              <select
                value={itemsPerPage}
                onChange={handleItemsPerPageChange}
                className="flex-1 sm:flex-none px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-20 focus:border-transparent outline-none"
                style={
                  {
                    "--tw-ring-color": colors.primary + "33",
                  } as React.CSSProperties
                }
              >
                <option value={5}>5 per page</option>
                <option value={10}>10 per page</option>
                <option value={25}>25 per page</option>
                <option value={50}>50 per page</option>
                <option value={100}>100 per page</option>
              </select>
            </div>
          </div>

          {/* Date Navigation */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4 py-3 sm:py-4">
            <button
              onClick={navigatePrevious}
              className="flex items-center justify-center px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm sm:text-base order-1 sm:order-1"
            >
              <MdChevronLeft className="mr-1 text-base sm:text-lg" />
              Previous
            </button>

            <div
              className="px-4 sm:px-6 py-2 rounded-lg text-base sm:text-lg font-semibold text-center order-2 sm:order-2 min-w-0 sm:min-w-64"
              style={{
                backgroundColor: colors.secondary,
                color: colors.foreground,
              }}
            >
              {formatDateDisplay()}
            </div>

            <button
              onClick={navigateNext}
              disabled={!canNavigateNext()}
              className={`flex items-center justify-center px-4 py-2 rounded-lg transition-colors text-sm sm:text-base order-3 sm:order-3 ${
                canNavigateNext()
                  ? "bg-white border border-gray-300 hover:bg-gray-50"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
              }`}
            >
              Next
              <MdChevronRight className="ml-1 text-base sm:text-lg" />
            </button>
          </div>
        </div>

        {/* Results Summary */}
        {!isLoading && (
          <div className="mb-3 sm:mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs sm:text-sm text-gray-600 gap-2">
            <div>
              Showing{" "}
              {paginatedData.length > 0
                ? (currentPage - 1) * itemsPerPage + 1
                : 0}{" "}
              to{" "}
              {Math.min(
                currentPage * itemsPerPage,
                paginationConfig.totalItems
              )}{" "}
              of {paginationConfig.totalItems} employees
              {searchTerm && (
                <span className="block sm:inline sm:ml-2 text-blue-600">
                  (filtered by "{searchTerm}")
                </span>
              )}
              {storeFilter !== "all" && (
                <span className="block sm:inline sm:ml-2 text-green-600">
                  from "{getSelectedStoreName()}"
                </span>
              )}
            </div>
          </div>
        )}

        {/* Table */}
        {/* Mobile Card Layout - visible on small screens */}
        <div className="block sm:hidden space-y-3">
          {paginatedData.map((employee, index) => (
            <div
              key={employee.employeeId}
              onClick={() => handleEmployeeClick(employee.employeeId)}
              className={`bg-white rounded-lg shadow-sm border p-4 ${
                viewMode !== "day"
                  ? "cursor-pointer active:bg-gray-50"
                  : "cursor-default"
              }`}
              style={
                index % 2 === 1 ? { backgroundColor: colors.tertiary } : {}
              }
            >
              {/* Employee Info */}
              <div className="flex items-start justify-between mb-3 pb-3 border-b">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center mb-1">
                    <MdPeople
                      className="mr-2 text-base flex-shrink-0"
                      style={{ color: colors.primary }}
                    />
                    <h3
                      className="font-medium text-sm truncate"
                      style={{ color: colors.foreground }}
                    >
                      {employee.username}
                    </h3>
                  </div>
                  <p className="text-xs text-gray-600 truncate">
                    {employee.email}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    <MdStore className="inline mr-1 text-xs" />
                    {employee.storeName}
                  </p>
                </div>
              </div>

              {/* Attendance Stats */}
              {viewMode === "day" ? (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600">Status:</span>
                  {employee.relevantAttendance.length > 0 ? (
                    <span
                      className={`inline-flex px-2 py-1 rounded-full text-[10px] font-medium border ${getStatusColor(
                        employee.relevantAttendance[0].status
                      )}`}
                    >
                      {employee.relevantAttendance[0].status
                        .replace("_", " ")
                        .toUpperCase()}
                    </span>
                  ) : (
                    <span className="text-gray-400 text-xs">No data</span>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center">
                    <p className="text-[10px] text-gray-500 mb-1">Present</p>
                    <span className="inline-flex px-2 py-1 rounded-md text-xs font-medium bg-green-100 text-green-800">
                      {employee.summary.present}
                    </span>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-gray-500 mb-1">Absent</p>
                    <span className="inline-flex px-2 py-1 rounded-md text-xs font-medium bg-red-100 text-red-800">
                      {employee.summary.absent}
                    </span>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-gray-500 mb-1">Late</p>
                    <span className="inline-flex px-2 py-1 rounded-md text-xs font-medium bg-yellow-100 text-yellow-800">
                      {employee.summary.late}
                    </span>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-gray-500 mb-1">Early Exit</p>
                    <span className="inline-flex px-2 py-1 rounded-md text-xs font-medium bg-orange-100 text-orange-800">
                      {employee.summary.earlyExit}
                    </span>
                  </div>
                  <div className="text-center col-span-2">
                    <p className="text-[10px] text-gray-500 mb-1">Total Days</p>
                    <span className="inline-flex px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800">
                      {employee.summary.total}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}

          {paginatedData.length === 0 && !isLoading && (
            <div className="bg-white rounded-lg shadow-sm border p-8 text-center text-gray-500">
              <MdPeople className="mx-auto text-4xl text-gray-300 mb-3" />
              <p className="text-base">No employees found</p>
              <p className="text-xs">
                Try adjusting your search or filter criteria
              </p>
            </div>
          )}
        </div>

        {/* Desktop Table Layout - visible on larger screens */}
        <div className="hidden sm:block bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead style={{ backgroundColor: colors.primary }}>
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white">
                    <div className="flex items-center">
                      <MdPeople className="mr-2 text-base" />
                      Employee
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white">
                    Email
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white">
                    Store
                  </th>
                  {viewMode === "day" ? (
                    <th className="px-6 py-4 text-center text-sm font-semibold text-white">
                      Status
                    </th>
                  ) : (
                    <>
                      <th className="px-6 py-4 text-center text-sm font-semibold text-white">
                        Present
                      </th>
                      <th className="px-6 py-4 text-center text-sm font-semibold text-white">
                        Absent
                      </th>
                      <th className="px-6 py-4 text-center text-sm font-semibold text-white">
                        Late
                      </th>
                      <th className="px-6 py-4 text-center text-sm font-semibold text-white">
                        Early Exit
                      </th>
                      <th className="px-6 py-4 text-center text-sm font-semibold text-white">
                        Total Days
                      </th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paginatedData.map((employee, index) => (
                  <tr
                    key={employee.employeeId}
                    onClick={() => handleEmployeeClick(employee.employeeId)}
                    className={`transition-colors ${
                      viewMode !== "day"
                        ? "hover:bg-gray-50 cursor-pointer"
                        : "cursor-default"
                    } ${index % 2 === 0 ? "bg-white" : ""}`}
                    style={
                      index % 2 === 1
                        ? { backgroundColor: colors.tertiary }
                        : {}
                    }
                    title={
                      viewMode === "day"
                        ? "Switch to month or year view to access detailed reports"
                        : "Click to view detailed attendance report"
                    }
                  >
                    <td className="px-6 py-4">
                      <div
                        className="font-medium text-sm"
                        style={{ color: colors.foreground }}
                      >
                        {employee.username}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {employee.email}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {employee.storeName}
                    </td>
                    {viewMode === "day" ? (
                      <td className="px-6 py-4 text-center">
                        {employee.relevantAttendance.length > 0 ? (
                          <span
                            className={`inline-flex px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                              employee.relevantAttendance[0].status
                            )}`}
                          >
                            {employee.relevantAttendance[0].status
                              .replace("_", " ")
                              .toUpperCase()}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-sm">No data</span>
                        )}
                      </td>
                    ) : (
                      <>
                        <td className="px-6 py-4 text-center">
                          <span className="inline-flex px-2 py-1 rounded-md text-sm font-medium bg-green-100 text-green-800">
                            {employee.summary.present}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="inline-flex px-2 py-1 rounded-md text-sm font-medium bg-red-100 text-red-800">
                            {employee.summary.absent}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="inline-flex px-2 py-1 rounded-md text-sm font-medium bg-yellow-100 text-yellow-800">
                            {employee.summary.late}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="inline-flex px-2 py-1 rounded-md text-sm font-medium bg-orange-100 text-orange-800">
                            {employee.summary.earlyExit}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="inline-flex px-2 py-1 rounded-md text-sm font-medium bg-gray-100 text-gray-800">
                            {employee.summary.total}
                          </span>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
                {paginatedData.length === 0 && !isLoading && (
                  <tr>
                    <td
                      colSpan={viewMode === "day" ? 4 : 8}
                      className="px-6 py-12 text-center text-gray-500"
                    >
                      <MdPeople className="mx-auto text-5xl text-gray-300 mb-4" />
                      <p className="text-lg">No employees found</p>
                      <p className="text-sm">
                        Try adjusting your search or filter criteria
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {paginationConfig.totalPages > 1 && (
          <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0">
            <div className="flex items-center gap-2 order-2 sm:order-1">
              <span className="text-xs sm:text-sm text-gray-600">
                Page {paginationConfig.currentPage} of{" "}
                {paginationConfig.totalPages}
              </span>
            </div>

            <div className="flex items-center gap-1 order-1 sm:order-2 flex-wrap justify-center">
              {/* First Page Button */}
              <button
                onClick={goToFirstPage}
                disabled={paginationConfig.currentPage === 1}
                className={`p-1.5 sm:p-2 rounded-lg transition-colors ${
                  paginationConfig.currentPage === 1
                    ? "text-gray-400 cursor-not-allowed"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
                title="First Page"
              >
                <MdFirstPage className="text-base sm:text-lg" />
              </button>

              {/* Previous Page Button */}
              <button
                onClick={goToPreviousPage}
                disabled={paginationConfig.currentPage === 1}
                className={`p-1.5 sm:p-2 rounded-lg transition-colors ${
                  paginationConfig.currentPage === 1
                    ? "text-gray-400 cursor-not-allowed"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
                title="Previous Page"
              >
                <MdChevronLeft className="text-base sm:text-lg" />
              </button>

              {/* Page Numbers */}
              <div className="flex items-center gap-0.5 sm:gap-1">
                {getPageNumbers().map((pageNum, index) => {
                  if (pageNum === -1 || pageNum === -2) {
                    return (
                      <span
                        key={`ellipsis-${index}`}
                        className="px-2 sm:px-3 py-1 sm:py-2 text-gray-400 text-xs sm:text-sm"
                      >
                        ...
                      </span>
                    );
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => goToPage(pageNum)}
                      className={`px-2 sm:px-3 py-1 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                        pageNum === paginationConfig.currentPage
                          ? "text-white"
                          : "text-gray-600 hover:bg-gray-100"
                      }`}
                      style={
                        pageNum === paginationConfig.currentPage
                          ? { backgroundColor: colors.primary }
                          : {}
                      }
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              {/* Next Page Button */}
              <button
                onClick={goToNextPage}
                disabled={
                  paginationConfig.currentPage === paginationConfig.totalPages
                }
                className={`p-1.5 sm:p-2 rounded-lg transition-colors ${
                  paginationConfig.currentPage === paginationConfig.totalPages
                    ? "text-gray-400 cursor-not-allowed"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
                title="Next Page"
              >
                <MdChevronRight className="text-base sm:text-lg" />
              </button>

              {/* Last Page Button */}
              <button
                onClick={goToLastPage}
                disabled={
                  paginationConfig.currentPage === paginationConfig.totalPages
                }
                className={`p-1.5 sm:p-2 rounded-lg transition-colors ${
                  paginationConfig.currentPage === paginationConfig.totalPages
                    ? "text-gray-400 cursor-not-allowed"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
                title="Last Page"
              >
                <MdLastPage className="text-base sm:text-lg" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendanceTable;
