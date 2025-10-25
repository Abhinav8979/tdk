"use client";
import React from "react";

const SkeletonBox = ({ className = "" }: { className?: string }) => (
  <div className={`bg-gray-200 animate-pulse rounded-md ${className}`}></div>
);

const DashboardSkeleton: React.FC = () => {
  return (
    <div className="min-h-screen p-6 md:p-10 lg:p-12 space-y-12">
      {/* Profile & Upcoming Leave */}
      <div className="flex flex-col md:flex-row justify-between items-center bg-white rounded-2xl shadow-lg p-8 space-y-6 md:space-y-0">
        <div className="flex items-center space-x-6">
          <SkeletonBox className="w-20 h-20 rounded-full" />
          <div className="space-y-3">
            <SkeletonBox className="w-40 h-6" />
            <SkeletonBox className="w-60 h-4" />
          </div>
        </div>
        <SkeletonBox className="w-64 h-6" />
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array(4)
          .fill(0)
          .map((_, i) => (
            <div
              key={i}
              className="bg-white p-6 rounded-2xl shadow-lg flex flex-col items-center justify-center space-y-4 h-40"
            >
              <SkeletonBox className="w-24 h-5" />
              <SkeletonBox className="w-16 h-8" />
              <SkeletonBox className="w-14 h-14 rounded-full" />
            </div>
          ))}
      </div>

      {/* Leave History */}
      <div className="space-y-4">
        <SkeletonBox className="w-40 h-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array(3)
            .fill(0)
            .map((_, i) => (
              <div
                key={i}
                className="bg-white p-6 rounded-2xl shadow-lg space-y-4"
              >
                <SkeletonBox className="w-32 h-5" />
                <SkeletonBox className="w-24 h-4" />
                <SkeletonBox className="w-24 h-4" />
                <SkeletonBox className="w-40 h-4" />
              </div>
            ))}
        </div>
      </div>

      {/* Summary Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[1, 2].map((val) => (
          <div
            key={val}
            className="bg-white p-6 rounded-2xl shadow-lg space-y-3"
          >
            <SkeletonBox className="w-32 h-6 mb-3" />
            <SkeletonBox className="w-60 h-4" />
            <SkeletonBox className="w-48 h-4" />
            <SkeletonBox className="w-40 h-4" />
          </div>
        ))}
      </div>
    </div>
  );
};

export default DashboardSkeleton;
