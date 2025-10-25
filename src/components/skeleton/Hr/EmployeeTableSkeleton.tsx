import React from "react";
import {
  FaUser,
  FaPhone,
  FaUserTie,
  FaCalendarAlt,
  FaEye,
} from "react-icons/fa";

// Custom Skeleton component
const Skeleton = ({ width = "100%", height = "20px", className = "" }) => (
  <div
    className={`bg-gray-200 rounded animate-pulse ${className}`}
    style={{ width, height }}
  />
);

const EmployeeTableSkeleton = () => {
  // Generate skeleton rows
  const skeletonRows = Array.from({ length: 10 }, (_, index) => (
    <tr
      key={index}
      className="hover:bg-[#e4ecaa] cursor-pointer transition-colors"
    >
      <td className="px-6 py-4 whitespace-nowrap">
        <Skeleton width="120px" height="16px" />
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <Skeleton width="100px" height="16px" />
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <Skeleton width="130px" height="16px" />
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <Skeleton width="90px" height="16px" />
      </td>
      <td className="px-6 py-4 whitespace-nowrap flex justify-center">
        <Skeleton width="20px" height="20px" className="rounded-full" />
      </td>
    </tr>
  ));

  return (
    <div className="p-6 min-h-screen">
      <div className="flex items-center justify-between">
        <div className="mb-6">
          {/* <Skeleton width="250px" height="36px" /> */}
          <h1 className="text-3xl font-bold text-[#2c2c2c] mb-6">
            Employee Directory
          </h1>
        </div>

        {/* Search Bar Skeleton */}
        <div className="mb-6 flex">
          {/* <Skeleton width="300px" height="40px" className="rounded" /> */}
          <input
            type="text"
            placeholder="Search employees..."
            className="p-2 border border-[#e4ecaa] focus:outline-[var(--primary-background)] rounded w-full max-w-md bg-white text-[#2c2c2c]"
          />
        </div>
      </div>

      {/* Table Skeleton */}
      <div className="rounded-lg shadow overflow-hidden">
        <div className="overflow-hidden">
          <table className="min-w-full">
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
              {skeletonRows}
            </tbody>
          </table>
        </div>

        {/* Pagination Skeleton */}
        <div className="bg-[#e4ecaa] px-6 py-3 flex items-center justify-between border-t border-[#b4ca01]">
          <div className="flex items-center space-x-2">
            <Skeleton width="200px" height="16px" />
          </div>
          <div className="flex space-x-2">
            <Skeleton width="80px" height="36px" className="rounded-md" />
            <Skeleton width="60px" height="36px" className="rounded-md" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeTableSkeleton;
