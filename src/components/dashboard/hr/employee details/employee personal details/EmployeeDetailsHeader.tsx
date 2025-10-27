import React from "react";
import { FaBriefcase, FaIdCard, FaUser } from "react-icons/fa";

type Employee = {
  username: string;
  empNo: string;
  userType?: string;
  role?: string;
  profilePicture?: string;
};

type Props = {
  employee: Employee;
};

const EmployeeDetailsHeader: React.FC<Props> = ({ employee }) => {
  return (
    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 w-full p-4 bg-white rounded-2xl shadow-sm">
      {/* Avatar / Profile Picture */}
      <div className="relative h-20 w-20 sm:h-24 sm:w-24 flex-shrink-0">
        {employee?.profilePicture ? (
          <img
            src={employee.profilePicture}
            alt={employee.username}
            className="h-full w-full rounded-full object-cover shadow-lg border-2 border-[#b4ca01]"
          />
        ) : (
          <div className="bg-[#b4ca01] rounded-full h-full w-full flex items-center justify-center text-white text-2xl sm:text-3xl font-bold shadow-lg">
            {employee?.username
              ?.split(" ")
              .map((name) => name[0])
              .join("") || <FaUser />}
          </div>
        )}
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
