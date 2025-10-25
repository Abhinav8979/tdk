import React from "react";

const Skeleton = ({
  width = "100%",
  height = "1rem",
  className = "",
}: {
  width?: string | number;
  height?: string | number;
  className?: string;
}) => (
  <div
    className={`animate-pulse bg-gray-200 rounded ${className}`}
    style={{ width, height }}
  />
);
const LeaveSkeleton = () => (
  <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
      {/* Employee Info Skeleton */}
      <div className="flex-1 space-y-3">
        <div className="flex items-center gap-3">
          <Skeleton width="1.25rem" height="1.25rem" className="rounded-full" />
          <div>
            <Skeleton width="150px" height="1.25rem" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="text-sm">
            <Skeleton width="120px" height="1rem" />
          </div>
          <div className="text-sm">
            <Skeleton width="140px" height="1rem" />
          </div>
          <div className="text-sm">
            <Skeleton width="130px" height="1rem" />
          </div>
        </div>

        <div className="text-sm">
          <Skeleton width="80%" height="1rem" />
        </div>
      </div>

      {/* Status & Actions Skeleton */}
      <div className="flex flex-col items-end gap-3">
        <div className="flex items-center gap-2">
          <Skeleton width="1.25rem" height="1.25rem" className="rounded-full" />
          <Skeleton width="80px" height="1.5rem" className="rounded-full" />
        </div>

        <div className="flex gap-2">
          <Skeleton width="80px" height="2.5rem" className="rounded-lg" />
          <Skeleton width="70px" height="2.5rem" className="rounded-lg" />
        </div>
      </div>
    </div>
  </div>
);
const LeaveRequestSkeleton = () => {
  return (
    <div className="space-y-6">
      {/* Filter Bar Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex gap-4">
          <Skeleton width="80px" height="2.5rem" className="rounded-lg" />

          {/* Status Filter Skeleton */}
          <div className="flex items-center gap-2">
            <Skeleton width="1.25rem" height="1.25rem" />
            <Skeleton width="120px" height="2.5rem" className="rounded-lg" />
          </div>

          {/* Date View Filter Skeleton */}
          <div className="flex items-center gap-2">
            <Skeleton width="1.25rem" height="1.25rem" />
            <Skeleton width="140px" height="2.5rem" className="rounded-lg" />
          </div>
        </div>

        <div className="text-sm">
          <Skeleton width="120px" height="1rem" />
        </div>
      </div>

      {/* Requests List Skeleton */}
      <div className="grid gap-4">
        {[...Array(3)].map((_, index) => (
          <LeaveSkeleton key={index} />
        ))}
      </div>
    </div>
  );
};

export default LeaveRequestSkeleton;
