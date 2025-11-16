"use client";

import DashboardSkeleton from "@/components/skeleton/employee/EmployeeDashboardSkeleton";
import { useGetEmployeeSummary } from "@/hooks/RTKHooks";
import { useSession } from "next-auth/react";
import React, { useEffect, useState } from "react";
import { IoDocumentTextOutline } from "react-icons/io5";
import ModalLayout from "@/layouts/ModalLayout";
import PolicyUploadModal from "@/components/modal/Policy";

type Leave = {
  leaveId: string;
  startDate: string;
  endDate: string;
  effectiveDays: number;
  reason: string;
  status: "approved" | "pending" | "rejected";
};

type EmployeeSummary = {
  name: string;
  address: string;
  totalAttendance: number;
  leaveHistory: Leave[];
  leavesLeft: number;
  totalExpenses: number;
};

const Card = ({
  title,
  content,
  icon,
  onClick,
}: {
  title: string;
  content: string | number;
  icon?: React.ReactNode;
  onClick?: () => void;
}) => (
  <div
    className={`bg-white p-6 rounded-2xl shadow-lg flex flex-col items-center justify-between h-full transition-transform hover:scale-105 hover:shadow-xl ${
      onClick ? "cursor-pointer" : ""
    }`}
    onClick={onClick}
  >
    <div className="text-lg font-semibold mb-4 text-[var(--foreground)]">
      {title}
    </div>
    <div className="text-3xl font-bold text-[var(--primary-background)]">
      {content}
    </div>
    {icon && <div className="mt-4">{icon}</div>}
  </div>
);

const Dashboard = () => {
  const [id, setId] = useState<string | undefined>();
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const session = useSession();

  useEffect(() => {
    if (!id && session.status === "authenticated" && session.data?.user) {
      console.log(session.data.user.profile);
      setId(session.data.user.userId as string);
    } else if (id) {
      setId(id);
    }
  }, [session.status, session.data, id]);

  const { data, isPending } = useGetEmployeeSummary(id as string);

  if (session.status !== "authenticated" && !id) {
    return null;
  }

  if (isPending) {
    return <DashboardSkeleton />;
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-screen">
        <h1 className="text-2xl font-semibold text-[var(--foreground)]">
          No data available
        </h1>
      </div>
    );
  }

  const {
    name,
    address,
    totalAttendance,
    leaveHistory,
    leavesLeft,
    totalExpenses,
  }: EmployeeSummary = data;

  const presentAttendance = totalAttendance;

  const leaveTaken = leaveHistory
    .filter((leave) => leave.status === "approved")
    .reduce((total, leave) => total + leave.effectiveDays, 0);

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getUserInitials = (fullName: string): string => {
    return fullName
      .split(" ")
      .map((name) => name[0])
      .join("")
      .toUpperCase();
  };

  return (
    <div className="min-h-screen  p-6 md:p-10 lg:p-12">
      {/* Profile and Next Leave Section */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-12 bg-white rounded-2xl shadow-lg p-8">
        <div className="flex items-center space-x-6">
          <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-[var(--primary-background)] text-white flex items-center justify-center text-2xl font-bold">
            {getUserInitials(name)}
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-[var(--foreground)]">
              {name}
            </h2>
            <p className="text-md md:text-lg text-[var(--foreground)] opacity-80">
              {address}
            </p>
          </div>
        </div>
      </div>

      {/* Cards Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card
          title="Total Attendance"
          content={totalAttendance + " days present"}
        />
        <Card title="Leave Taken" content={`${leaveTaken} days`} />
        <Card title="Balance Leave" content={`${leavesLeft} leaves left`} />
        <Card
          title="Total Expenses"
          content={totalExpenses > 0 ? `₹${totalExpenses}` : "₹0"}
        />
      </div>

      {/* Policy Documents Card */}
      <div className="mt-6">
        <Card
          title="Company Policies"
          content="View Documents"
          icon={
            <IoDocumentTextOutline
              size={32}
              className="text-[var(--primary-background)]"
            />
          }
          onClick={() => setShowPolicyModal(true)}
        />
      </div>

      {/* Leave History Section */}
      <div className="mt-12">
        <h3 className="text-2xl font-bold text-[var(--foreground)] mb-6">
          Leave History
        </h3>
        {leaveHistory.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {leaveHistory.map((leave) => (
              <div
                key={leave.leaveId}
                className="bg-white p-6 rounded-2xl shadow-lg transition-transform hover:scale-105"
              >
                <div className="flex justify-between items-start mb-4">
                  <h4 className="text-lg font-semibold text-[var(--foreground)]">
                    {leave.effectiveDays} Day
                    {leave.effectiveDays !== 1 ? "s" : ""} Leave
                  </h4>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      leave.status === "approved"
                        ? "bg-[var(--secondary-background)] text-[var(--foreground)]"
                        : leave.status === "rejected"
                        ? "bg-red-100 text-red-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {leave.status.charAt(0).toUpperCase() +
                      leave.status.slice(1)}
                  </span>
                </div>
                <p className="text-sm text-[var(--foreground)] mb-2">
                  <strong>From:</strong> {formatDate(leave.startDate)}
                </p>
                <p className="text-sm text-[var(--foreground)] mb-2">
                  <strong>To:</strong> {formatDate(leave.endDate)}
                </p>
                <p className="text-sm text-[var(--foreground)]">
                  <strong>Reason:</strong> {leave.reason}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white p-6 rounded-2xl shadow-lg text-center">
            <p className="text-lg text-[var(--foreground)] opacity-60">
              No leave history available
            </p>
          </div>
        )}

        {/* Summary Section */}
        <div className="mt-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-lg">
              <h4 className="text-lg font-bold text-[var(--foreground)] mb-4">
                Leave Summary
              </h4>
              <div className="space-y-3">
                <p className="text-sm text-[var(--foreground)]">
                  <strong>Total Leave Taken:</strong> {leaveTaken} days
                </p>
                <p className="text-sm text-[var(--foreground)]">
                  <strong>Leaves Remaining:</strong> {leavesLeft} days
                </p>
                <p className="text-sm text-[var(--foreground)]">
                  <strong>Pending Requests:</strong>{" "}
                  {leaveHistory.filter((l) => l.status === "pending").length}
                </p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-lg">
              <h4 className="text-lg font-bold text-[var(--foreground)] mb-4">
                Quick Stats
              </h4>
              <div className="space-y-3">
                <p className="text-sm text-[var(--foreground)]">
                  <strong>Total Attendance:</strong> {totalAttendance} days
                </p>
                <p className="text-sm text-[var(--foreground)]">
                  <strong>Total Expenses:</strong> ₹{totalExpenses}
                </p>
                <p className="text-sm text-[var(--foreground)]">
                  <strong>Leave Requests:</strong> {leaveHistory.length} total
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Policy Upload Modal */}
      {showPolicyModal && (
        <ModalLayout>
          <PolicyUploadModal
            id={id}
            onClose={() => setShowPolicyModal(false)}
            isUploadAllowed={false}
          />
        </ModalLayout>
      )}
    </div>
  );
};

export default Dashboard;
