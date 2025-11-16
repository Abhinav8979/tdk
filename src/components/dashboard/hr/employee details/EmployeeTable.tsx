"use client";
import React, { useEffect, useState } from "react";
import {
  FaChevronLeft,
  FaChevronRight,
  FaEye,
  FaCalendarAlt,
  FaPhone,
  FaUser,
  FaUserTie,
} from "react-icons/fa";
import { useRouter } from "next/navigation";
import { useEmployeeDetals, useGetAllStoreNames } from "@/hooks/RTKHooks";
import { EmployeeDetails } from "@/types/hrDashboard.types";
import Button from "@/components/ui/button/Button";
import axios from "axios";
import { rootHrRoute } from "@/lib/paths";
import EmployeeTableSkeleton from "@/components/skeleton/Hr/EmployeeTableSkeleton";
import { useAppDispatch } from "@/hooks/ReduxSelector";
import { setLoading } from "@/redux/store/utils";
import AllStoreFilter from "@/components/AllStoreFilter";

const EmployeeTable: React.FC = () => {
  const { data: allStoreNames } = useGetAllStoreNames(true);

  const [storeFilter, setStoreFilter] = useState<string>(
    allStoreNames!! ? allStoreNames[0].name : "Dehradun"
  );

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [searchTerm, setSearchTerm] = useState<string>("");

  const router = useRouter();
  const {
    data: employeesData,
    isPending,
    isFetching,
    status,
  } = useEmployeeDetals(storeFilter);

  console.log(isFetching);
  const [finalEmployeesData, setFinalEmployeeData] = useState<
    EmployeeDetails[] | null
  >(null);
  const dispatch = useAppDispatch();

  // apply search + store filter
  const filteredEmployees =
    finalEmployeesData?.filter((employee: EmployeeDetails) => {
      const matchesSearch = employee.username
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const empStore = (
        employee.store ??
        employee.store_info?.name ??
        ""
      ).toString();
      const matchesStore =
        storeFilter === "All Stores" ? true : empStore === storeFilter;
      return matchesSearch && matchesStore;
    }) ?? [];

  useEffect(() => {
    const fetchManagers = async () => {
      if (status === "success" && employeesData) {
        // Step 1: Get unique manager IDs
        const uniqueManagerIds = [
          ...new Set(
            employeesData
              .filter((ele) => ele.reportingManager)
              .map((ele) => ele.reportingManager)
              .filter((id): id is string | null => id !== undefined)
          ),
        ];

        // Step 2: Fetch all managers in parallel (only unique ones)
        const managerDataMap: Record<string | number, string> = {};
        await Promise.all(
          uniqueManagerIds.map(async (id: any) => {
            try {
              const { data } = await axios.get<{ username: string }>(
                `/api/user?empId=${id}`
              );
              managerDataMap[id] = data.username;
            } catch (error) {
              console.error(`Failed to fetch manager with id ${id}:`, error);
              managerDataMap[id] = "Unknown";
            }
          })
        );

        // Step 3: Map employees to their manager names
        const updatedData = employeesData.map((ele) => ({
          ...ele,
          reportingManagerName:
            ele.reportingManager && managerDataMap[ele.reportingManager]
              ? managerDataMap[ele.reportingManager]
              : undefined,
        }));

        setFinalEmployeeData(updatedData);
      }
    };

    fetchManagers();
  }, [status, employeesData]);

  if (isPending || isFetching || finalEmployeesData === null) {
    return <EmployeeTableSkeleton />;
  }

  const employeesPerPage = 10;

  const indexOfLastEmployee = currentPage * employeesPerPage;
  const indexOfFirstEmployee = indexOfLastEmployee - employeesPerPage;
  const currentEmployees = filteredEmployees.slice(
    indexOfFirstEmployee,
    indexOfLastEmployee
  );

  const totalPages = Math.ceil(filteredEmployees.length / employeesPerPage);

  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleEmployeeClick = (employeeId: string) => {
    dispatch(setLoading(true));
    router.push(`${rootHrRoute}/employee-details/${employeeId}`);
  };

  return (
    <div className="w-full p-6 bg-white rounded-lg shadow-md">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Employee Directory</h1>
      </div>

      {/* Search Bar */}
      <div className="mb-4 flex gap-4 flex-wrap">
        <input
          type="text"
          placeholder="Search employees..."
          className="flex-1 min-w-[200px] px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(1);
          }}
        />
        <AllStoreFilter
          stores={allStoreNames}
          selectedStore={storeFilter}
          onStoreChange={(e: any) => setStoreFilter(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <FaUser className="inline mr-2" />
                Employee Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <FaPhone className="inline mr-2" />
                Phone Number
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <FaUserTie className="inline mr-2" />
                Reporting Manager
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <FaCalendarAlt className="inline mr-2" />
                Date of Birth
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {currentEmployees.length > 0 ? (
              currentEmployees.map((employee: EmployeeDetails) => (
                <tr
                  key={employee.id}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => handleEmployeeClick(employee.id)}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {employee.username || "N/A"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {employee.contact || "N/A"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {employee.reportingManagerName || "N/A"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {employee.dob?.split("T")[0] || "N/A"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <Button
                      className="text-blue-600 hover:text-blue-900"
                      onClick={(e: React.MouseEvent) => {
                        e.stopPropagation();
                        handleEmployeeClick(employee.id);
                      }}
                    >
                      <FaEye className="inline mr-1" />
                      View
                    </Button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={5}
                  className="px-6 py-4 text-center text-sm text-gray-500"
                >
                  No employees found matching your search criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {currentEmployees.length > 0 ? (
          currentEmployees.map((employee: EmployeeDetails) => (
            <div
              key={employee.id}
              className="bg-white p-4 rounded-lg shadow border border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => handleEmployeeClick(employee.id)}
            >
              <div className="space-y-2">
                <div className="flex items-center">
                  <FaUser className="mr-2 text-gray-400" />
                  <span className="font-medium text-gray-900">
                    {employee.username || "N/A"}
                  </span>
                </div>
                <div className="flex items-center">
                  <FaPhone className="mr-2 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    {employee.contact || "N/A"}
                  </span>
                </div>
                <div className="flex items-center">
                  <FaUserTie className="mr-2 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    {employee.reportingManagerName || "N/A"}
                  </span>
                </div>
                <div className="flex items-center">
                  <FaCalendarAlt className="mr-2 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    {employee.dob?.split("T")[0] || "N/A"}
                  </span>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-200">
                <Button
                  className="w-full text-blue-600 hover:text-blue-900"
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    handleEmployeeClick(employee.id);
                  }}
                >
                  <FaEye className="inline mr-1" />
                  View Details
                </Button>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-gray-500">
            No employees found matching your search criteria.
          </div>
        )}
      </div>

      {/* Pagination */}
      <div className="mt-6 flex items-center justify-between flex-wrap gap-4">
        <div className="text-sm text-gray-700">
          Showing{" "}
          <span className="font-medium">{indexOfFirstEmployee + 1}</span> to{" "}
          <span className="font-medium">
            {Math.min(indexOfLastEmployee, filteredEmployees.length)}
          </span>{" "}
          of <span className="font-medium">{filteredEmployees.length}</span>{" "}
          employees
        </div>
        <div className="flex gap-2">
          <Button
            onClick={prevPage}
            disabled={currentPage === 1}
            className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            <FaChevronLeft className="inline mr-1" />
            Previous
          </Button>
          <Button
            onClick={nextPage}
            disabled={
              currentPage === totalPages || filteredEmployees.length === 0
            }
            className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Next
            <FaChevronRight className="inline ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EmployeeTable;
