import React from "react";

// Skeleton component
const Skeleton = ({ className = "", width = "100%", height = "20px" }) => (
  <div
    className={`animate-pulse bg-gray-300 rounded ${className}`}
    style={{ width, height }}
  />
);

const PayslipGeneratorSkeleton = () => {
  return (
    <div
      className="min-h-screen p-6 text-[var(--foreground)]"
      style={
        {
          "--primary-background": "#b4ca01",
          "--foreground": "#2c2c2c",
          "--secondary-background": "#e4ecaa",
          "--tertiary-background": "#fafcf0",
        } as React.CSSProperties
      }
    >
      <div className="mx-auto">
        {/* Input Form Skeleton */}
        <div className="mb-8 p-6">
          <Skeleton className="mb-4" width="200px" height="24px" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Employee Information Fields */}
            {Array.from({ length: 10 }).map((_, index) => (
              <div key={index}>
                <Skeleton className="mb-2" width="150px" height="16px" />
                {index < 3 ? (
                  // First 3 are read-only fields (Name, ID, Department)
                  <Skeleton width="100%" height="20px" />
                ) : (
                  // Rest are input fields
                  <Skeleton width="100%" height="40px" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Buttons Skeleton */}
        <div className="flex gap-4 mb-6">
          <Skeleton width="140px" height="40px" />
          <Skeleton width="160px" height="40px" />
        </div>

        {/* Payslip Display Skeleton */}
        <div className="p-8 rounded-lg shadow-lg bg-white">
          {/* Company Header */}
          <div className="text-center mb-6">
            <Skeleton className="mx-auto mb-2" width="300px" height="36px" />
            <Skeleton className="mx-auto mb-2" width="120px" height="32px" />
            <Skeleton className="mx-auto" width="180px" height="16px" />
          </div>

          {/* Employee Details Section */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <Skeleton className="mb-2" width="140px" height="20px" />
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="flex">
                    <Skeleton width="60px" height="16px" className="mr-2" />
                    <Skeleton width="120px" height="16px" />
                  </div>
                ))}
              </div>
            </div>
            <div>
              <Skeleton className="mb-2" width="140px" height="20px" />
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="flex">
                    <Skeleton width="100px" height="16px" className="mr-2" />
                    <Skeleton width="80px" height="16px" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Earnings and Deductions Section */}
          <div className="grid grid-cols-2 gap-6">
            {/* Earnings Skeleton */}
            <div>
              <Skeleton className="mb-3" width="100%" height="40px" />
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="flex justify-between">
                    <Skeleton width="140px" height="16px" />
                    <Skeleton width="80px" height="16px" />
                  </div>
                ))}
                {/* Gross Salary */}
                <div className="border-t pt-2 flex justify-between">
                  <Skeleton width="100px" height="18px" />
                  <Skeleton width="100px" height="18px" />
                </div>
              </div>
            </div>

            {/* Deductions Skeleton */}
            <div>
              <Skeleton className="mb-3" width="100%" height="40px" />
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="flex justify-between">
                    <Skeleton width="160px" height="16px" />
                    <Skeleton width="80px" height="16px" />
                  </div>
                ))}
                {/* Total Deductions */}
                <div className="border-t pt-2 flex justify-between">
                  <Skeleton width="120px" height="18px" />
                  <Skeleton width="100px" height="18px" />
                </div>
              </div>
            </div>
          </div>

          {/* Net Salary Skeleton */}
          <div className="mt-6">
            <Skeleton width="100%" height="60px" />
          </div>

          {/* Footer Skeleton */}
          <div className="mt-6 text-center space-y-2">
            <Skeleton className="mx-auto" width="300px" height="12px" />
            <Skeleton className="mx-auto" width="200px" height="12px" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PayslipGeneratorSkeleton;
