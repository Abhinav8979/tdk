import React, { FC } from "react";
import { FaUsers, FaFemale, FaMale } from "react-icons/fa";

const Skeleton = ({ width = "100%", height = "20px", className = "" }) => (
  <div
    className={`bg-gray-200 rounded animate-pulse ${className}`}
    style={{ width, height }}
  />
);

export const EmployeeFamilyDetailsSkeleton = () => {
  return (
    <>
      <div className="border-b-2 border-[#f0f4d3] px-6 py-4">
        <h3 className="text-xl font-semibold text-[#2c2c2c] flex items-center gap-2">
          <FaUsers className="text-[#b4ca01]" /> Family Information
        </h3>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-2 gap-6">
          {/* Father's Information Skeleton */}
          <div className="bg-[#f8fae8] rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <FaMale className="h-5 w-5 text-gray-300" />
              <h4 className="font-medium">Father's Information</h4>
            </div>
            <div className="space-y-3 ml-8">
              <div>
                <p className="text-sm text-gray-500">Name</p>
                <div className="mt-1">
                  <Skeleton width="140px" height="18px" />
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500">Contact Number</p>
                <div className="mt-1">
                  <Skeleton width="110px" height="18px" />
                </div>
              </div>
            </div>
          </div>

          {/* Mother's Information Skeleton */}
          <div className="bg-[#f8fae8] rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <FaFemale className="h-5 w-5 text-gray-300" />
              <h4 className="font-medium">Mother's Information</h4>
            </div>
            <div className="space-y-3 ml-8">
              <div>
                <p className="text-sm text-gray-500">Name</p>
                <div className="mt-1">
                  <Skeleton width="130px" height="18px" />
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500">Contact Number</p>
                <div className="mt-1">
                  <Skeleton width="110px" height="18px" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
