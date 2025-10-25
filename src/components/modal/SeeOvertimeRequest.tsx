import {
  useGetOvertimeRequest,
  useUpdateOvertimeRequest,
} from "@/hooks/RTKHooks";
import React, { useState, useEffect, useMemo, JSX } from "react";
import {
  FaCalendarAlt,
  FaClock,
  FaUser,
  FaChevronDown,
  FaChevronUp,
  FaSync,
  FaTimes,
  FaExclamationTriangle,
  FaCheckCircle,
  FaCheck,
  FaBan,
  FaSearch,
  FaEdit,
  FaSave,
} from "react-icons/fa";
import { toast } from "react-toastify";

// TypeScript interfaces
interface OvertimeRequest {
  id: string;
  employeeName: string;
  employeeId: string;
  date: string;
  hours: number;
  approvedHours?: number;
  status: "pending" | "approved" | "rejected";
  remarks?: string;
  createdAt: string;
  approvedAt?: string;
}

interface Toast {
  id: string;
  type: "error" | "success" | "info";
  message: string;
}

interface ApiError {
  data?: {
    message?: string;
  };
  message?: string;
}

interface ApiResponse {
  data?: any;
}

interface UpdateOvertimePayload {
  approvedHours: number;
  status: "accepted" | "rejected" | "approved";
}

interface UpdateOvertimeRequest {
  id: string;
  payload: UpdateOvertimePayload;
}

type SortField = "employeeName" | "date" | "hours" | "status" | "createdAt";
type SortDirection = "asc" | "desc";

interface SeeOvertimeRequestProps {
  onClose: () => void;
}

interface ToastNotificationProps {
  toast: Toast;
  onRemove: (id: string) => void;
}

interface SortIconProps {
  field: SortField;
}

interface EditingHours {
  [requestId: string]: number;
}

const SeeOvertimeRequest: React.FC<SeeOvertimeRequestProps> = ({ onClose }) => {
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [processingRequests, setProcessingRequests] = useState<Set<string>>(
    new Set()
  );
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [editingHours, setEditingHours] = useState<EditingHours>({});
  const [editingRequestId, setEditingRequestId] = useState<string | null>(null);

  // RTK Query integration
  const {
    data: apiData,
    isPending,
    isError,
    error,
    refetch,
  } = useGetOvertimeRequest();

  const { mutate: updateOvertime } = useUpdateOvertimeRequest();

  // Extract requests from API response
  const requests = useMemo((): OvertimeRequest[] => {
    const response = apiData as ApiResponse;
    return response?.data || apiData || [];
  }, [apiData]);

  const statusColors: Record<string, string> = {
    PENDING: "bg-amber-50 text-amber-700 border-amber-200",
    APPROVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
    REJECTED: "bg-rose-50 text-rose-700 border-rose-200",
  };

  const statusIcons: Record<string, JSX.Element> = {
    PENDING: <FaClock className="w-3 h-3" />,
    APPROVED: <FaCheckCircle className="w-3 h-3" />,
    REJECTED: <FaBan className="w-3 h-3" />,
  };

  useEffect(() => {
    if (isError) {
      const apiError = error as ApiError;
      const errorMessage =
        apiError?.data?.message ||
        apiError?.message ||
        "Failed to load overtime requests";
      toast.error(errorMessage);
    }
  }, [isError, error]);

  const handleSort = (field: SortField): void => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handleRefresh = (): void => {
    refetch();
  };

  // Handle edit hours functionality
  const handleEditHours = (requestId: string, currentHours: number): void => {
    setEditingRequestId(requestId);
    setEditingHours((prev) => ({
      ...prev,
      [requestId]: currentHours,
    }));
  };

  const handleSaveHours = (requestId: string): void => {
    setEditingRequestId(null);
    // Hours are saved in state and will be used when approving/rejecting
  };

  const handleCancelEdit = (requestId: string): void => {
    setEditingRequestId(null);
    setEditingHours((prev) => {
      const newState = { ...prev };
      delete newState[requestId];
      return newState;
    });
  };

  const handleHoursChange = (requestId: string, value: string): void => {
    const numericValue = parseFloat(value);
    if (!isNaN(numericValue) && numericValue >= 0) {
      setEditingHours((prev) => ({
        ...prev,
        [requestId]: numericValue,
      }));
    }
  };

  // Handle approve/reject actions with approved hours
  const handleApprove = async (requestId: string): Promise<void> => {
    const request = requests.find((r) => r.id === requestId);
    if (!request) return;

    const approvedHours = editingHours[requestId] ?? request.hours;

    setProcessingRequests((prev) => new Set(prev).add(requestId));
    try {
      const updatePayload: UpdateOvertimeRequest = {
        id: requestId,
        payload: {
          approvedHours,
          status: "approved",
        },
      };

      updateOvertime(updatePayload, {
        onSuccess: () => {
          toast.success("Request approved successfully!");
        },
      });

      // Clear editing state for this request
      setEditingHours((prev) => {
        const newState = { ...prev };
        delete newState[requestId];
        return newState;
      });

      refetch(); // Refresh the data
    } catch (error) {
      toast.error("Failed to approve request");
    } finally {
      setProcessingRequests((prev) => {
        const newSet = new Set(prev);
        newSet.delete(requestId);
        return newSet;
      });
    }
  };

  const handleReject = async (requestId: string): Promise<void> => {
    const request = requests.find((r) => r.id === requestId);
    if (!request) return;

    const approvedHours = editingHours[requestId] ?? request.hours;

    setProcessingRequests((prev) => new Set(prev).add(requestId));
    try {
      const updatePayload: UpdateOvertimeRequest = {
        id: requestId,
        payload: {
          approvedHours,
          status: "rejected",
        },
      };

      updateOvertime(updatePayload, {
        onSuccess: () => {
          toast.warning("Request rejected successfully!");
        },
      });

      // Clear editing state for this request
      setEditingHours((prev) => {
        const newState = { ...prev };
        delete newState[requestId];
        return newState;
      });

      refetch(); // Refresh the data
    } catch (error) {
      toast.error("Failed to reject request");
    } finally {
      setProcessingRequests((prev) => {
        const newSet = new Set(prev);
        newSet.delete(requestId);
        return newSet;
      });
    }
  };

  // Filter and search functionality
  const filteredRequests = useMemo((): OvertimeRequest[] => {
    return requests.filter((request) => {
      const matchesStatus =
        filterStatus === "ALL" || request.status === filterStatus;
      const matchesSearch =
        request.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.employeeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.remarks?.toLowerCase().includes(searchTerm.toLowerCase());

      return matchesStatus && matchesSearch;
    });
  }, [requests, filterStatus, searchTerm]);

  const sortedRequests = useMemo((): OvertimeRequest[] => {
    return [...filteredRequests].sort((a, b) => {
      let aVal: string | number | Date = a[sortField] as string | number;
      let bVal: string | number | Date = b[sortField] as string | number;

      if (sortField === "date" || sortField === "createdAt") {
        aVal = new Date(aVal as string);
        bVal = new Date(bVal as string);
      }

      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredRequests, sortField, sortDirection]);

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const SortIcon: React.FC<SortIconProps> = ({ field }) => {
    if (sortField !== field)
      return <FaChevronDown className="w-3 h-3 opacity-50" />;
    return sortDirection === "asc" ? (
      <FaChevronUp className="w-3 h-3 text-blue-600" />
    ) : (
      <FaChevronDown className="w-3 h-3 text-blue-600" />
    );
  };

  return (
    <div className="max-h-[90vh] overflow-scroll rounded-lg bg-gray-50 p-2 sm:p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">
                Overtime Request Management
              </h1>
              <p className="text-sm sm:text-base text-gray-600">
                Review, approve, and manage overtime requests
              </p>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 self-end sm:self-auto">
              <button
                onClick={handleRefresh}
                disabled={isPending}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium transition-all duration-200 hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FaSync
                  className={`w-3 h-3 sm:w-4 sm:h-4 ${
                    isPending ? "animate-spin" : ""
                  }`}
                />
                <span className="hidden sm:inline">Refresh</span>
              </button>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all duration-200"
                title="Close"
              >
                <FaTimes className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="flex-1">
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3 sm:w-4 sm:h-4" />
                <input
                  type="text"
                  placeholder="Search by name, ID, or remarks..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 sm:pl-10 pr-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="w-full sm:w-48">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="ALL">All Status</option>
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-gray-200">
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900">
              Request Results
            </h3>
            <p className="text-sm sm:text-base text-gray-600 mt-1">
              {sortedRequests.length}{" "}
              {sortedRequests.length === 1 ? "request" : "requests"} found
            </p>
          </div>

          {isPending ? (
            <div className="p-8 sm:p-12 text-center">
              <div className="inline-flex items-center gap-3">
                <FaSync className="w-5 h-5 sm:w-6 sm:h-6 animate-spin text-blue-600" />
                <span className="text-base sm:text-lg text-gray-600">
                  Loading...
                </span>
              </div>
            </div>
          ) : isError ? (
            <div className="p-8 sm:p-12 text-center">
              <FaExclamationTriangle className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 text-red-300" />
              <p className="text-lg sm:text-xl font-medium text-red-600 mb-2">
                Failed to load requests
              </p>
              <button
                onClick={handleRefresh}
                className="px-4 sm:px-6 py-2 sm:py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm sm:text-base"
              >
                Try Again
              </button>
            </div>
          ) : sortedRequests.length === 0 ? (
            <div className="p-8 sm:p-12 text-center">
              <FaClock className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg sm:text-xl font-medium mb-2 text-gray-900">
                No requests found
              </p>
              <p className="text-sm sm:text-base text-gray-600">
                {searchTerm || filterStatus !== "ALL"
                  ? "Try adjusting your filters"
                  : "No overtime requests available"}
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th
                        className="px-6 py-4 text-left font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => handleSort("employeeName")}
                      >
                        <div className="flex items-center gap-2">
                          <FaUser className="w-4 h-4" />
                          Employee
                          <SortIcon field="employeeName" />
                        </div>
                      </th>
                      <th
                        className="px-6 py-4 text-left font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => handleSort("date")}
                      >
                        <div className="flex items-center gap-2">
                          <FaCalendarAlt className="w-4 h-4" />
                          Date
                          <SortIcon field="date" />
                        </div>
                      </th>
                      <th
                        className="px-6 py-4 text-left font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => handleSort("hours")}
                      >
                        <div className="flex items-center gap-2">
                          <FaClock className="w-4 h-4" />
                          Hours
                          <SortIcon field="hours" />
                        </div>
                      </th>
                      <th
                        className="px-6 py-4 text-left font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => handleSort("status")}
                      >
                        <div className="flex items-center gap-2">
                          Status
                          <SortIcon field="status" />
                        </div>
                      </th>
                      <th className="px-6 py-4 text-left font-semibold text-gray-900">
                        Remarks
                      </th>
                      <th
                        className="px-6 py-4 text-left font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => handleSort("createdAt")}
                      >
                        <div className="flex items-center gap-2">
                          Submitted
                          <SortIcon field="createdAt" />
                        </div>
                      </th>
                      <th className="px-6 py-4 text-center font-semibold text-gray-900">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {sortedRequests.map((request) => (
                      <tr
                        key={request.id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="font-semibold text-gray-900">
                            {request.employeeName}
                          </div>
                        </td>
                        <td className="px-6 py-4 font-medium text-gray-900">
                          {formatDate(request.date)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {editingRequestId === request.id ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  min="0"
                                  step="0.5"
                                  value={
                                    editingHours[request.id] || request.hours
                                  }
                                  onChange={(e) =>
                                    handleHoursChange(
                                      request.id,
                                      e.target.value
                                    )
                                  }
                                  className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                                />
                                <span className="text-sm font-medium">h</span>
                                <button
                                  onClick={() => handleSaveHours(request.id)}
                                  className="p-1 text-green-600 hover:text-green-700"
                                >
                                  <FaSave className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => handleCancelEdit(request.id)}
                                  className="p-1 text-gray-600 hover:text-gray-700"
                                >
                                  <FaTimes className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <>
                                <span className="font-semibold text-gray-900">
                                  {editingHours[request.id] || request.hours}h
                                </span>
                                {request.status === "pending" && (
                                  <button
                                    onClick={() =>
                                      handleEditHours(request.id, request.hours)
                                    }
                                    className="p-1 text-blue-600 hover:text-blue-700"
                                  >
                                    <FaEdit className="w-3 h-3" />
                                  </button>
                                )}
                                {request.approvedHours &&
                                  request.approvedHours !== request.hours && (
                                    <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                                      approved: {request.approvedHours}h
                                    </span>
                                  )}
                              </>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border ${
                              statusColors[request.status.toUpperCase()]
                            }`}
                          >
                            {statusIcons[request.status.toUpperCase()]}
                            {request.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="max-w-xs">
                            {request.remarks ? (
                              <span className="text-sm text-gray-700 bg-gray-100 px-2 py-1 rounded">
                                {request.remarks.length > 50
                                  ? `${request.remarks.substring(0, 50)}...`
                                  : request.remarks}
                              </span>
                            ) : (
                              <span className="text-sm italic text-gray-400">
                                No remarks
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">
                            {formatDate(request.createdAt)}
                          </div>
                          {request.approvedAt && (
                            <div className="text-xs text-gray-500">
                              Approved: {formatDate(request.approvedAt)}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {request.status === "pending" ? (
                            <div className="flex justify-center gap-2">
                              <button
                                onClick={() => handleApprove(request.id)}
                                disabled={processingRequests.has(request.id)}
                                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-all disabled:opacity-50"
                              >
                                <FaCheck className="w-3 h-3" />
                                Approve
                              </button>
                              <button
                                onClick={() => handleReject(request.id)}
                                disabled={processingRequests.has(request.id)}
                                className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 text-white text-sm font-medium rounded-lg hover:bg-rose-700 transition-all disabled:opacity-50"
                              >
                                <FaBan className="w-3 h-3" />
                                Reject
                              </button>
                            </div>
                          ) : (
                            <div className="flex justify-center">
                              <span
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
                                  request.status === "approved"
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-rose-100 text-rose-700"
                                }`}
                              >
                                {statusIcons[request.status.toUpperCase()]}
                                {request.status === "approved"
                                  ? "Approved"
                                  : "Rejected"}
                              </span>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="lg:hidden divide-y divide-gray-200">
                {sortedRequests.map((request) => (
                  <div
                    key={request.id}
                    className="p-4 hover:bg-gray-50 transition-colors"
                  >
                    {/* Employee Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="bg-blue-100 p-2 rounded-full">
                          <FaUser className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">
                            {request.employeeName}
                          </div>
                          <div className="text-xs text-gray-500">
                            {request.employeeId}
                          </div>
                        </div>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${
                          statusColors[request.status.toUpperCase()]
                        }`}
                      >
                        {statusIcons[request.status.toUpperCase()]}
                        {request.status}
                      </span>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="bg-gray-50 p-2.5 rounded-lg">
                        <div className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                          <FaCalendarAlt className="w-3 h-3" />
                          Date
                        </div>
                        <div className="text-sm font-medium text-gray-900">
                          {formatDate(request.date)}
                        </div>
                      </div>

                      <div className="bg-gray-50 p-2.5 rounded-lg">
                        <div className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                          <FaClock className="w-3 h-3" />
                          Hours
                        </div>
                        {editingRequestId === request.id ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min="0"
                              step="0.5"
                              value={editingHours[request.id] || request.hours}
                              onChange={(e) =>
                                handleHoursChange(request.id, e.target.value)
                              }
                              className="w-16 px-1 py-0.5 text-sm border border-gray-300 rounded"
                            />
                            <button
                              onClick={() => handleSaveHours(request.id)}
                              className="p-0.5 text-green-600"
                            >
                              <FaSave className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleCancelEdit(request.id)}
                              className="p-0.5 text-gray-600"
                            >
                              <FaTimes className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <span className="text-sm font-semibold text-gray-900">
                              {editingHours[request.id] || request.hours}h
                            </span>
                            {request.status === "pending" && (
                              <button
                                onClick={() =>
                                  handleEditHours(request.id, request.hours)
                                }
                                className="p-0.5 text-blue-600"
                              >
                                <FaEdit className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Remarks */}
                    {request.remarks && (
                      <div className="mb-3 bg-gray-50 p-2.5 rounded-lg">
                        <div className="text-xs text-gray-500 mb-1">
                          Remarks
                        </div>
                        <div className="text-sm text-gray-700">
                          {request.remarks}
                        </div>
                      </div>
                    )}

                    {/* Dates */}
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                      <span>Submitted: {formatDate(request.createdAt)}</span>
                      {request.approvedAt && (
                        <span>Approved: {formatDate(request.approvedAt)}</span>
                      )}
                    </div>

                    {/* Actions */}
                    {request.status === "pending" ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApprove(request.id)}
                          disabled={processingRequests.has(request.id)}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-all disabled:opacity-50"
                        >
                          <FaCheck className="w-3 h-3" />
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(request.id)}
                          disabled={processingRequests.has(request.id)}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-rose-600 text-white text-sm font-medium rounded-lg hover:bg-rose-700 transition-all disabled:opacity-50"
                        >
                          <FaBan className="w-3 h-3" />
                          Reject
                        </button>
                      </div>
                    ) : (
                      <div className="text-center">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium ${
                            request.status === "approved"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-rose-100 text-rose-700"
                          }`}
                        >
                          {statusIcons[request.status.toUpperCase()]}
                          {request.status === "approved"
                            ? "Approved"
                            : "Rejected"}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SeeOvertimeRequest;
