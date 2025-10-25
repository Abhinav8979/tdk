import { EmployeeDetails } from "@/types/hrDashboard.types";
import { calculateTenure, formatDate } from "@/utils/helperFunctions";
import React from "react";
import { FaBuilding, FaCalendarAlt, FaUserTie } from "react-icons/fa";

const EmployeeStatsDetails = ({ employee }: { employee: EmployeeDetails }) => {
  return (
    <>
      <div className="grid flex-1 grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Joined On */}
        <div className="rounded-xl shadow-md p-4 flex items-center gap-4">
          <div className="bg-[#f0f4d3] p-3 rounded-lg">
            <FaCalendarAlt className="h-6 w-6 text-[#b4ca01]" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Joined On</p>
            <p className="font-medium">{formatDate(employee.createdAt)}</p>
            <p className="text-xs text-[#b4ca01] font-medium">
              {calculateTenure(employee.createdAt)}
            </p>
          </div>
        </div>

        {/* Store Location */}
        <div className="rounded-xl flex-1 shadow-md p-4 flex items-center gap-4">
          <div className="bg-[#f0f4d3] p-3 rounded-lg">
            <FaBuilding className="h-6 w-6 text-[#b4ca01]" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Store Location</p>
            <p className="font-medium">{employee.store || "N/A"}</p>
          </div>
        </div>

        {/* Reports To */}
        <div className="rounded-xl flex-1 shadow-md p-4 flex items-center gap-4">
          <div className="bg-[#f0f4d3] p-3 rounded-lg">
            <FaUserTie className="h-6 w-6 text-[#b4ca01]" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Reports To</p>
            <p className="font-medium">{employee.reportingManager || "N/A"}</p>
          </div>
        </div>
      </div>
    </>
  );
};

export default EmployeeStatsDetails;
