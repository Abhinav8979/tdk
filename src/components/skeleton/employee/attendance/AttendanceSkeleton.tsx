import React from "react";

const AttendanceSkeleton: React.FC = () => {
  return (
    <section className="min-h-screen bg-[var(--tertiary-background)] p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header Skeleton */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gray-200 rounded animate-pulse"></div>
              <div>
                <div className="h-7 w-48 bg-gray-200 rounded animate-pulse mb-2"></div>
                <div className="h-4 w-64 bg-gray-200 rounded animate-pulse"></div>
              </div>
            </div>

            {/* Month Navigation Skeleton */}
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gray-200 rounded-lg animate-pulse"></div>
              <div className="text-center min-w-[200px]">
                <div className="h-6 w-40 bg-gray-200 rounded animate-pulse mx-auto"></div>
              </div>
              <div className="w-10 h-10 bg-gray-200 rounded-lg animate-pulse"></div>
            </div>
          </div>

          {/* Monthly Attendance Summary Skeleton */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, index) => (
              <div
                key={index}
                className="bg-gray-100 rounded-lg p-4 text-center animate-pulse"
              >
                <div className="h-8 w-12 bg-gray-200 rounded mx-auto mb-2"></div>
                <div className="h-4 w-16 bg-gray-200 rounded mx-auto"></div>
              </div>
            ))}
          </div>

          {/* Overall Attendance Summary Skeleton */}
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-6 border border-gray-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-6 h-6 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-6 w-48 bg-gray-200 rounded animate-pulse"></div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, index) => (
                <div key={index} className="text-center">
                  <div className="h-8 w-16 bg-gray-200 rounded mx-auto mb-2 animate-pulse"></div>
                  <div className="h-4 w-20 bg-gray-200 rounded mx-auto animate-pulse"></div>
                </div>
              ))}
            </div>

            {/* Attendance Percentage Bar Skeleton */}
            <div className="mt-4">
              <div className="flex justify-between items-center mb-2">
                <div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 w-12 bg-gray-200 rounded animate-pulse"></div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 animate-pulse">
                <div className="h-3 bg-gray-300 rounded-full w-3/4 animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Attendance List View Skeleton */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="h-6 w-48 bg-gray-200 rounded animate-pulse mb-4"></div>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {[...Array(8)].map((_, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 rounded-lg border bg-gray-50 animate-pulse"
              >
                <div className="flex items-center gap-4">
                  <div className="w-6 h-6 bg-gray-200 rounded-full"></div>
                  <div>
                    <div className="h-5 w-32 bg-gray-200 rounded mb-2"></div>
                    <div className="h-4 w-20 bg-gray-200 rounded"></div>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <div className="h-4 w-16 bg-gray-200 rounded mb-1"></div>
                    <div className="h-4 w-12 bg-gray-200 rounded"></div>
                  </div>
                  <div className="text-center">
                    <div className="h-4 w-16 bg-gray-200 rounded mb-1"></div>
                    <div className="h-4 w-12 bg-gray-200 rounded"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Legend Skeleton */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-6">
          <div className="h-5 w-24 bg-gray-200 rounded animate-pulse mb-3"></div>
          <div className="flex flex-wrap gap-6">
            {[...Array(5)].map((_, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="w-4 h-4 bg-gray-200 rounded-full animate-pulse"></div>
                <div className="h-4 w-16 bg-gray-200 rounded animate-pulse"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default AttendanceSkeleton;
