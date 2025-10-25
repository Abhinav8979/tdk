import React from "react";
import Skeleton, { SkeletonTheme } from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

const PayrollSystemSkeleton = () => {
  const skeletonRows = Array.from({ length: 10 }, (_, index) => index);

  return (
    <SkeletonTheme baseColor="#f5f5f4" highlightColor="#e7e5e4">
      <div className="min-h-screen bg-stone-50">
        <div className="max-w-7xl mx-auto px-3 py-2">
          {/* Month Navigation Skeleton */}
          <div className="mb-8 flex items-center justify-center">
            <div className="bg-white rounded-2xl shadow-lg p-2 border border-lime-100">
              <div className="flex items-center gap-6">
                {/* Previous Button Skeleton */}
                <div className="bg-lime-400 p-2 rounded-xl w-12 h-12">
                  <Skeleton height={24} width={24} />
                </div>

                {/* Month/Year Display Skeleton */}
                <div className="flex items-center gap-3 p-2">
                  <Skeleton height={24} width={24} />
                  <div className="min-w-[200px] text-center">
                    <Skeleton height={32} width={200} />
                  </div>
                  <Skeleton height={24} width={24} />
                </div>

                {/* Next Button Skeleton */}
                <div className="bg-lime-400 p-2 rounded-xl w-12 h-12">
                  <Skeleton height={24} width={24} />
                </div>
              </div>
            </div>
          </div>

          {/* Search Box Skeleton */}
          <div className="mb-6 flex justify-center">
            <div className="bg-white rounded-2xl shadow-lg border border-lime-100 p-1 w-full max-w-md">
              <div className="relative flex items-center">
                <div className="absolute left-4">
                  <Skeleton height={20} width={20} />
                </div>
                <div className="w-full pl-12 pr-12 py-3">
                  <Skeleton height={20} />
                </div>
              </div>
            </div>
          </div>

          {/* Payroll Table Skeleton */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-lime-100">
            {/* Table Header Skeleton */}
            <div className="bg-lime-400 px-6 py-4 flex justify-between items-center">
              <Skeleton height={24} width={300} />
              <Skeleton height={16} width={200} />
            </div>

            {/* Table Content Skeleton */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-lime-100 border-b border-lime-200">
                    <th className="p-4 text-left">
                      <Skeleton height={20} width={80} />
                    </th>
                    <th className="p-4 text-left">
                      <Skeleton height={20} width={100} />
                    </th>
                    <th className="p-4 text-left">
                      <Skeleton height={20} width={90} />
                    </th>
                    <th className="p-4 text-left">
                      <Skeleton height={20} width={90} />
                    </th>
                    <th className="p-4 text-left">
                      <Skeleton height={20} width={90} />
                    </th>
                    <th className="p-4 text-center">
                      <Skeleton height={20} width={70} />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {skeletonRows.map((_, index) => (
                    <tr
                      key={index}
                      className={`border-b border-stone-100 ${
                        index % 2 === 0 ? "bg-white" : "bg-stone-25"
                      }`}
                    >
                      {/* Employee Column */}
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="bg-lime-100 p-2 rounded-full w-10 h-10">
                            <Skeleton circle height={24} width={24} />
                          </div>
                          <div className="flex-1">
                            <Skeleton height={16} width={120} className="mb-1" />
                            <Skeleton height={12} width={180} />
                          </div>
                        </div>
                      </td>

                      {/* Basic Salary Column */}
                      <td className="p-4">
                        <Skeleton height={16} width={100} />
                      </td>

                      {/* Absent Days Column */}
                      <td className="p-4">
                        <div className="inline-block px-3 py-1 rounded-full bg-green-100">
                          <Skeleton height={14} width={60} />
                        </div>
                      </td>

                      {/* Deductions Column */}
                      <td className="p-4">
                        <div className="space-y-1">
                          <Skeleton height={12} width={80} />
                          <Skeleton height={12} width={70} />
                        </div>
                      </td>

                      {/* Net Salary Column */}
                      <td className="p-4">
                        <Skeleton height={20} width={120} />
                      </td>

                      {/* Actions Column */}
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center">
                          <div className="px-4 py-2 rounded-xl bg-lime-400">
                            <Skeleton height={16} width={120} />
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Skeleton */}
            <div className="bg-stone-50 px-6 py-4 border-t border-stone-200">
              <div className="flex items-center justify-between">
                <Skeleton height={16} width={100} />

                <div className="flex items-center gap-2">
                  {/* Pagination Buttons Skeleton */}
                  {Array.from({ length: 7 }, (_, index) => (
                    <div key={index} className="p-2">
                      <Skeleton height={32} width={32} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SkeletonTheme>
  );
};

export default PayrollSystemSkeleton;