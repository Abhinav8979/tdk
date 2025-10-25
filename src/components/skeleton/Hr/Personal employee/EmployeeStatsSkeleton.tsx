import React from "react";
import { FaBuilding, FaCalendarAlt, FaUserTie } from "react-icons/fa";

// Custom Skeleton component
const Skeleton = ({ width = "100%", height = "20px", className = "" }) => (
  <div
    className={`bg-gray-200 rounded animate-pulse ${className}`}
    style={{ width, height }}
  />
);

const EmployeeStatsDetailsSkeleton = () => {
  return (
    <>
      {/* Joined On Card Skeleton */}
      <div className="bg-white rounded-xl shadow-md p-4 flex items-center gap-4">
        <div className="bg-gray-100 p-3 rounded-lg animate-pulse">
          <FaCalendarAlt className="h-6 w-6 text-gray-300" />
        </div>
        <div className="flex-1">
          <p className="text-sm text-gray-500 mb-1">Joined On</p>
          <div className="mb-1">
            <Skeleton width="120px" height="18px" />
          </div>
          <div>
            <Skeleton width="80px" height="14px" />
          </div>
        </div>
      </div>

      {/* Store Location Card Skeleton */}
      <div className="bg-white rounded-xl shadow-md p-4 flex items-center gap-4">
        <div className="bg-gray-100 p-3 rounded-lg animate-pulse">
          <FaBuilding className="h-6 w-6 text-gray-300" />
        </div>
        <div className="flex-1">
          <p className="text-sm text-gray-500 mb-1">Store Location</p>
          <div>
            <Skeleton width="140px" height="18px" />
          </div>
        </div>
      </div>

      {/* Reports To Card Skeleton */}
      <div className="bg-white rounded-xl shadow-md p-4 flex items-center gap-4">
        <div className="bg-gray-100 p-3 rounded-lg animate-pulse">
          <FaUserTie className="h-6 w-6 text-gray-300" />
        </div>
        <div className="flex-1">
          <p className="text-sm text-gray-500 mb-1">Reports To</p>
          <div>
            <Skeleton width="160px" height="18px" />
          </div>
        </div>
      </div>
    </>
  );
};

export default EmployeeStatsDetailsSkeleton;
