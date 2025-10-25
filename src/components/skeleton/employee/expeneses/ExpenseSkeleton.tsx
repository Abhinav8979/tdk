import React from "react";

const ExpenseSkeleton = () => {
  return (
    <div className="min-h-screen bg-[var(--tertiary-background)] p-6">
      <div className="max-w-7xl mx-auto">
        <div className="animate-pulse">
          <div className="h-8 bg-[var(--secondary-background)] rounded mb-6 w-64"></div>
          <div className="grid gap-4">
            {[1, 2, 3].map((i: number) => (
              <div
                key={i}
                className="h-32 bg-[var(--secondary-background)] rounded-lg"
              ></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExpenseSkeleton;
