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
import { useEmployeeDetals, useReportingManager } from "@/hooks/RTKHooks";
import { EmployeeDetails } from "@/types/hrDashboard.types";
import Button from "@/components/ui/button/Button";
import axios from "axios";
import { rootHrRoute } from "@/lib/paths";
import EmployeeTableSkeleton from "@/components/skeleton/Hr/EmployeeTableSkeleton";
import { useAppDispatch } from "@/hooks/ReduxSelector";
import { setLoading } from "@/redux/store/utils";

const EmployeeTable = () => {
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [searchTerm, setSearchTerm] = useState<string>("");

  const router = useRouter();
  const { data: employeesData, isPending, status } = useEmployeeDetals();
  const [finalEmployeesData, setFinalEmployeeData] = useState<
    EmployeeDetails[] | null
  >(null);

  const dispatch = useAppDispatch();

  useEffect(() => {
    const fetchManagers = async () => {
      if (status === "success") {
        // Step 1: Get unique manager IDs
        const uniqueManagerIds = [
          ...new Set(
            employeesData
              .filter((ele) => ele.reportingManager)
              .map((ele) => ele.reportingManager)
          ),
        ];

        // Step 2: Fetch all managers in parallel (only unique ones)
        const managerDataMap: Record<string, string> = {};
        await Promise.all(
          uniqueManagerIds.map(async (id) => {
            const { data } = await axios.get(`/api/user?empId=${id}`);
            managerDataMap[id ?? 0] = data.username;
          })
        );

        // Step 3: Map employees to their manager names
        const updatedData = employeesData.map((ele) => ({
          ...ele,
          reportingManagerName: ele.reportingManager
            ? managerDataMap[ele.reportingManager]
            : undefined,
        }));

        setFinalEmployeeData(updatedData);
      }
    };

    fetchManagers();
  }, [status, employeesData]);

  if (isPending || finalEmployeesData === null) {
    return <EmployeeTableSkeleton />;
  }

  const employeesPerPage = 10;

  const filteredEmployees = finalEmployeesData!.filter(
    (employee: EmployeeDetails) =>
      employee.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
    <div className="p-4 sm:p-6 min-h-screen">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#2c2c2c]">
          Employee Directory
        </h1>

        {/* Search Bar */}
        <div className="flex w-full sm:w-auto">
          <input
            type="text"
            placeholder="Search employees..."
            className="p-2 border border-[#e4ecaa] focus:outline-[var(--primary-background)] rounded w-full sm:max-w-md bg-white text-[#2c2c2c]"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg shadow overflow-hidden mt-4">
        <div className="overflow-x-auto">
          <table className="min-w-full hidden sm:table">
            <thead className="bg-[var(--secondary-background)] text-[#2c2c2c]">
              <tr>
                <th className="px-6 py-3 text-left font-semibold">
                  <div className="flex items-center">
                    <FaUser className="mr-2" />
                    Employee Name
                  </div>
                </th>
                <th className="px-6 py-3 text-left font-semibold">
                  <div className="flex items-center">
                    <FaPhone className="mr-2" />
                    Phone Number
                  </div>
                </th>
                <th className="px-6 py-3 text-left font-semibold">
                  <div className="flex items-center">
                    <FaUserTie className="mr-2" />
                    Reporting Manager
                  </div>
                </th>
                <th className="px-6 py-3 text-left font-semibold">
                  <div className="flex items-center">
                    <FaCalendarAlt className="mr-2" />
                    Date of Birth
                  </div>
                </th>
                <th className="px-6 py-3 text-left font-semibold">
                  <div className="flex items-center">
                    <FaEye className="mr-2" />
                    Actions
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e4ecaa] text-center">
              {currentEmployees.length > 0 ? (
                currentEmployees.map((employee: EmployeeDetails) => (
                  <tr
                    key={employee.empNo}
                    className="hover:bg-[#e4ecaa] cursor-pointer transition-colors"
                    onClick={() => handleEmployeeClick(employee.id)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      {employee.username || "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {employee.contact || "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {employee.reportingManagerName || "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {employee.dob?.split("T")[0] || "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button className="text-[#b4ca01] hover:text-[#2c2c2c] transition-colors">
                        <FaEye size={20} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-4 text-center text-gray-500"
                  >
                    No employees found matching your search criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Mobile Card View */}
          <div className="sm:hidden">
            {currentEmployees.length > 0 ? (
              currentEmployees.map((employee: EmployeeDetails) => (
                <div
                  key={employee.empNo}
                  className="bg-white border border-[#e4ecaa] rounded-lg p-4 mb-3 shadow-sm"
                  onClick={() => handleEmployeeClick(employee.id)}
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-[#2c2c2c]">
                      {employee.username || "N/A"}
                    </span>
                    <button className="text-[#b4ca01] hover:text-[#2c2c2c]">
                      <FaEye size={18} />
                    </button>
                  </div>
                  <p className="text-sm text-[#2c2c2c]">
                    <FaPhone className="inline mr-1" />{" "}
                    {employee.contact || "N/A"}
                  </p>
                  <p className="text-sm text-[#2c2c2c]">
                    <FaUserTie className="inline mr-1" />{" "}
                    {employee.reportingManagerName || "N/A"}
                  </p>
                  <p className="text-sm text-[#2c2c2c]">
                    <FaCalendarAlt className="inline mr-1" />{" "}
                    {employee.dob?.split("T")[0] || "N/A"}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-center text-gray-500 py-4">
                No employees found matching your search criteria.
              </p>
            )}
          </div>
        </div>

        {/* Pagination */}
        <div className="bg-[#e4ecaa] px-4 sm:px-6 py-3 flex flex-col sm:flex-row items-center justify-between border-t border-[#b4ca01] gap-3">
          <div className="text-sm text-[#2c2c2c]">
            Showing{" "}
            <span className="font-medium">{indexOfFirstEmployee + 1}</span> to{" "}
            <span className="font-medium">
              {Math.min(indexOfLastEmployee, filteredEmployees.length)}
            </span>{" "}
            of <span className="font-medium">{filteredEmployees.length}</span>{" "}
            employees
          </div>
          <div className="flex space-x-2">
            <Button
              variant={
                currentPage === totalPages || totalPages === 0
                  ? "outline"
                  : "primary"
              }
              onClick={prevPage}
              disabled={currentPage === 1}
              className={`rounded-md ${
                currentPage === 1
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-[#b4ca01] text-[#2c2c2c]"
              }`}
            >
              <div className="flex items-center">
                <FaChevronLeft className="mr-2" /> Previous
              </div>
            </Button>
            <Button
              variant={
                currentPage === totalPages || totalPages === 0
                  ? "outline"
                  : "primary"
              }
              onClick={nextPage}
              disabled={currentPage === totalPages || totalPages === 0}
              className={`rounded-md  ${
                currentPage === totalPages || totalPages === 0
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-[#b4ca01] text-[#2c2c2c]"
              }`}
            >
              <div className="flex items-center">
                Next <FaChevronRight className="ml-2" />
              </div>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeTable;
