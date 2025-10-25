import React from "react";
import { FaBriefcase, FaIdCard } from "react-icons/fa";

type Employee = {
  username: string;
  empNo: string;
  userType?: string;
  role?: string;
};

type Props = {
  employee: Employee;
};

const EmployeeDetailsHeader: React.FC<Props> = ({ employee }) => {
  return (
    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 w-full p-4 bg-white rounded-2xl shadow-sm">
      {/* Avatar / Initials */}
      <div className="text-[#b4ca01] rounded-full h-20 w-20 sm:h-24 sm:w-24 flex items-center justify-center text-2xl sm:text-3xl font-bold shadow-lg flex-shrink-0">
        {employee?.username
          ?.split(" ")
          .map((name) => name[0])
          .join("")}
      </div>

      {/* Details */}
      <div className="text-center sm:text-left mt-3 sm:mt-0">
        <h2 className="text-2xl sm:text-3xl font-bold text-[#2c2c2c]">
          {employee?.username}
        </h2>

        {/* Info badges */}
        <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-2">
          <span className="px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 border border-gray-200">
            <FaIdCard className="text-[#b4ca01]" /> ID: {employee?.empNo}
          </span>
          <span className="px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 capitalize border border-gray-200">
            <FaBriefcase className="text-[#b4ca01]" />
            {employee?.userType || "N/A"}
          </span>
        </div>

        {/* Role */}
        <div className="mt-3">
          <span className="bg-[#2c2c2c] text-white px-4 py-1 rounded-full text-xs sm:text-sm font-medium uppercase">
            {employee?.role || "N/A"}
          </span>
        </div>
      </div>
    </div>
  );
};

export default EmployeeDetailsHeader;
