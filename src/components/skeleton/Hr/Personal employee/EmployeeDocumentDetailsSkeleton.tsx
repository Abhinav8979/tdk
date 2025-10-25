import React from "react";
import { FaFileUpload } from "react-icons/fa";

// Custom Skeleton component
const Skeleton = ({ width = "100%", height = "20px", className = "" }) => (
  <div
    className={`bg-gray-200 rounded animate-pulse ${className}`}
    style={{ width, height }}
  />
);

const EmployeeDocumentDetailsSkeleton = () => {
  return (
    <>
      <div className="border-b-2 border-[#f0f4d3] px-6 py-4">
        <h3 className="text-xl font-semibold text-[#2c2c2c] flex items-center gap-2">
          <FaFileUpload className="text-[#b4ca01]" /> Documents
        </h3>
      </div>

      <div className="p-6">
        <div>
          <p className="font-medium mb-4">Additional Documents</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Generate 4 skeleton document items */}
            {Array.from({ length: 4 }, (_, index) => (
              <div
                key={index}
                className="flex items-center gap-2 bg-gray-100 p-3 rounded-lg animate-pulse"
              >
                <FaFileUpload className="text-gray-300 flex-shrink-0" />
                <div className="flex-1">
                  <Skeleton
                    width={`${Math.floor(Math.random() * 40) + 60}%`}
                    height="14px"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default EmployeeDocumentDetailsSkeleton;
