"use client";

import React, { useEffect, useState } from "react";
import { useReportingManager, useUser } from "@/hooks/RTKHooks";
import { useForm, Controller } from "react-hook-form";
import UserProfileSkeleton from "@/components/dashboard/employee/Personal details/PersonalDetailsSkeleton";

// Utility to format keys
const formatKey = (key: string) =>
  key
    .replace(/([a-z])([A-Z])/g, "$1_$2")
    .replace(/_/g, " ")
    .replace(
      /\w\S*/g,
      (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    );

const UserProfilePage = () => {
  const { data: user, isPending, isError } = useUser();

  const [reportingManager, setReportingManager] = useState("");

  const { mutate: getReportingManager } = useReportingManager();

  const { control } = useForm();

  useEffect(() => {
    if (!isPending && user) {
      getReportingManager(user.reportingManager, {
        onSuccess: (data) => {
          setReportingManager(data);
        },
      });
    }
  }, [isPending, user]);

  if (isPending) {
    return <UserProfileSkeleton />;
  }

  if (isError || !user) {
    return (
      <div className="text-center text-red-500 text-lg font-medium">
        Failed to load user data.
      </div>
    );
  }

  function getTenure(fromDateStr: string): string {
    const startDate = new Date(fromDateStr);
    const today = new Date();

    // Difference in milliseconds
    const diffMs = today.getTime() - startDate.getTime();
    if (diffMs < 0) return "Invalid date (in the future)";

    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    const diffMonths = diffDays / 30.4375; // Avg month length
    const diffYears = diffDays / 365.25; // Avg year length

    if (diffYears >= 1) {
      return `${diffYears.toFixed(1)} years`; // e.g. "1.2 years"
    } else if (diffMonths >= 1) {
      return `${Math.floor(diffMonths)} months`; // e.g. "4 months"
    } else {
      return `${Math.floor(diffDays)} days`; // e.g. "2 days"
    }
  }

  // Example usage
  console.log(getTenure("2024-06-10")); // e.g. "1.2 years" or "4 months" or "2 days"

  const personal_info = {
    phone_number: user.contact || "N/A",
    alt_phone_number: user.altContact || "N/A",
    adhar_number: {
      value: user.aadhar_number || "N/A",
      uploadable: true,
    },
    pan_number: {
      value: user.pan_number || "N/A",
      uploadable: true,
    },
    present_address: user.address || "N/A",
    email_address: user.email || "N/A",
    dob: user.dob || "N/A",
  };

  const details = {
    designation: user.userType || "N/A",
    reporting_manager: reportingManager || "N/A",
    store: user.store || "N/A",
    doj: user.createdAt.split("T")[0] || "N/A",
    tenure: getTenure(user.createdAt.split("T")[0]),
  };

  const additional_info = {
    permanent_address: user.permanent_address || "N/A",
    fathers_name: {
      name: user.fatherName || "N/A",
      phone_number: user.fatherPhone || "N/A",
    },
    mother_name: {
      name: user.motherName || "N/A",
      phone_number: user.motherPhone || "N/A",
    },
    police_verification: {
      value: user.police_verification || "N/A",
      uploadable: true,
    },
  };

  const Section = ({
    title,
    data,
    sectionKey,
  }: {
    title: string;
    data: Record<string, any>;
    sectionKey: string;
  }) => {
    return (
      <section className="mb-12">
        {title && (
          <h2 className="text-2xl font-semibold mb-6 border-b-2 pb-2 text-[var(--foreground)] tracking-wide">
            {title}
          </h2>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Object.entries(data).map(([key, value]) => {
            const actualValue =
              typeof value === "object" &&
              value !== null &&
              !Array.isArray(value)
                ? value.value ?? "N/A"
                : value;

            const fieldName = `${sectionKey}.${key}`;

            return (
              <div
                key={key}
                className="p-4 rounded-xl shadow-md bg-[var(--tertiary-background)] hover:shadow-lg transition-all border border-gray-300"
              >
                {key.includes("name") ? (
                  <div className="flex justify-between">
                    <div className="">
                      <h4 className="text-sm uppercase  font-semibold text-[var(--foreground)] tracking-wide">
                        {formatKey(key)}
                      </h4>
                      <p>{value?.name || "N/A"}</p>
                    </div>
                    <div className="">
                      <h4 className="text-sm uppercase font-semibold text-[var(--foreground)] tracking-wide">
                        Phone Number
                      </h4>
                      <p>{value?.phone_number || "N/A"}</p>
                    </div>
                  </div>
                ) : key === "reporting_manager" ? (
                  <>
                    <h4 className="text-sm uppercase font-semibold text-[var(--foreground)] mb-1 tracking-wide">
                      {formatKey(key)}
                    </h4>
                    <p>{reportingManager}</p>
                  </>
                ) : (
                  <>
                    <h4 className="text-sm uppercase font-semibold text-[var(--foreground)] mb-1 tracking-wide">
                      {formatKey(key)}
                    </h4>
                    <Controller
                      name={fieldName}
                      control={control}
                      defaultValue={
                        key === "reporting_manager"
                          ? reportingManager
                          : actualValue
                      }
                      render={({ field }) => (
                        <input
                          {...field}
                          type="text"
                          className={`text-[var(--foreground)] text-sm w-full px-2 py-1 rounded-md ${"border-none bg-transparent"}`}
                        />
                      )}
                    />
                  </>
                )}
              </div>
            );
          })}
        </div>
      </section>
    );
  };

  return (
    <div className="w-full flex-1 py-10 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <h1 className="text-4xl font-bold text-[var(--foreground)] leading-tight">
            User Profile
          </h1>
        </div>

        <form>
          <div className="p-4 mb-3">
            <div className="mb-3">
              <h3 className="text-md font-medium text-[var(--foreground)]">
                Name:
              </h3>
              <p>{user.username || "N/A"}</p>
            </div>
            <div>
              <h3 className="text-md font-medium text-[var(--foreground)]">
                Emp ID:
              </h3>
              <p>{user.empNo || "N/A"}</p>
            </div>
          </div>

          <Section
            title="Employee Details"
            data={details}
            sectionKey="details"
          />
          <Section
            title="Personal Information"
            data={personal_info}
            sectionKey="personal_info"
          />

          <Section
            title="Additional Information"
            data={additional_info}
            sectionKey="additional_info"
          />
        </form>
      </div>
    </div>
  );
};

export default UserProfilePage;
