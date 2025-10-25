import React from "react";
import { FaBriefcase, FaIdCard } from "react-icons/fa";

// Custom Skeleton component
const Skeleton = ({ width = "100%", height = "20px", className = "" }) => (
  <div
    className={`bg-gray-200 rounded animate-pulse ${className}`}
    style={{ width, height }}
  />
);

const EmployeeDetailsHeaderSkeleton: React.FC = () => {
  return (
    <div className="flex items-center gap-6">
      {/* Avatar Circle Skeleton */}
      <div className="bg-gray-200 rounded-full h-24 w-24 flex items-center justify-center animate-pulse">
        <div className="w-8 h-8 bg-gray-300 rounded"></div>
      </div>

      <div className="flex-1">
        {/* Name Skeleton */}
        <div className="mb-3">
          <Skeleton width="250px" height="32px" />
        </div>

        {/* ID and User Type Tags Skeleton */}
        <div className="flex items-center gap-2 mt-2 mb-3">
          <div className="flex items-center gap-1 px-3 py-1 bg-gray-100 rounded-full animate-pulse">
            <FaIdCard className="text-gray-300" />
            <Skeleton width="60px" height="16px" />
          </div>
          <div className="flex items-center gap-1 px-3 py-1 bg-gray-100 rounded-full animate-pulse">
            <FaBriefcase className="text-gray-300" />
            <Skeleton width="80px" height="16px" />
          </div>
        </div>

        {/* Role Badge Skeleton */}
        <div className="mt-3">
          <div className="bg-gray-200 px-4 py-1 rounded-full inline-block animate-pulse">
            <Skeleton width="100px" height="16px" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeDetailsHeaderSkeleton;
