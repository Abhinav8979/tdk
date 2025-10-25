import React from "react";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

const CalendarSkeleton = () => {
  const days = Array.from({ length: 42 }); // 6 weeks x 7 days

  return (
    <div className="p-6">
      {/* Toolbar placeholder */}
      <div className="mb-6 flex justify-between items-center">
        <Skeleton width={180} height={40} />
        <div className="flex gap-4">
          <Skeleton width={120} height={40} />
          <Skeleton width={120} height={40} />
        </div>
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-3">
        {days.map((_, idx) => (
          <div key={idx} className="h-[90px] w-full rounded-md overflow-hidden">
            <Skeleton height="100%" />
          </div>
        ))}
      </div>
    </div>
  );
};

export default CalendarSkeleton;
