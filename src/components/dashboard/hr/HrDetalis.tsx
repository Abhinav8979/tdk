"use client";
import React, { useEffect, useState } from "react";
import {
  FaUser,
  FaEnvelope,
  FaPhone,
  FaMapMarkerAlt,
  FaCalendarAlt,
  FaClock,
  FaBuilding,
  FaUsers,
  FaFileAlt,
  FaCamera,
  FaIdBadge,
  FaBriefcase,
  FaSpinner,
} from "react-icons/fa";
import { IconType } from "react-icons";
import { usePersonalDetails } from "@/hooks/RTKHooks";
import { toast } from "react-toastify";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/button/Button";
import UserProfileSkeleton from "../employee/Personal details/PersonalDetailsSkeleton";

interface HRData {
  username: string;
  email: string;
  contact: string;
  altContact: string;
  address: string;
  city: string;
  empNo: string;
  store: string;
  dob: string;
  fatherName: string;
  fatherPhone: string;
  motherName: string;
  motherPhone: string;
  expectedInTime: string;
  expectedOutTime: string;
  leaveDays: number;
  compOff: number;
  createdAt: string;
  profilePicture: string | null;
  role: string;
}

interface InfoCardProps {
  icon: IconType;
  label: string;
  value: string;
  subValue?: string;
}

interface StatCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
}

const HRProfileView: React.FC = () => {
  const [hrData, setHrData] = useState<HRData | null>(null);
  const { data: session, status } = useSession();
  const [userId, setUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { mutate: personalDetails, isPending } = usePersonalDetails();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated" && session?.user?.userId) {
      setUserId(session.user.userId);
    }
  }, [session, status]);

  // Fetch personal details once userId is available
  useEffect(() => {
    const fetchPersonalDetails = async () => {
      console.log(userId);
      if (!userId) return;

      // setIsLoading(true);
      setError(null);

      personalDetails(userId, {
        onSuccess: (data: HRData) => {
          setHrData(data);
          // setIsLoading(false);
        },
        onError: (err: any) => {
          const errorMessage = "Failed to load HR details";
          toast.error(errorMessage);
          setError(errorMessage);
          // setIsLoading(false);
        },
      });
    };

    fetchPersonalDetails();
  }, [userId, personalDetails]);

  const InfoCard: React.FC<InfoCardProps> = ({
    icon: Icon,
    label,
    value,
    subValue,
  }) => (
    <div className="flex items-start space-x-4 p-4 rounded-lg bg-white border border-gray-100 hover:shadow-sm transition-all duration-200">
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-green-50 flex items-center justify-center">
        <Icon size={20} className="text-green-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">
          {label}
        </p>
        <p className="text-lg font-semibold text-gray-900 mt-1 break-words">
          {value || "Not provided"}
        </p>
        {subValue && (
          <p className="text-sm text-gray-600 mt-1 break-words">{subValue}</p>
        )}
      </div>
    </div>
  );

  const StatCard: React.FC<StatCardProps> = ({ title, value, subtitle }) => (
    <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
      <div className="text-center">
        <div className="text-3xl font-bold text-green-700 mb-2">{value}</div>
        <div className="text-sm font-medium text-gray-700">{title}</div>
        {subtitle && (
          <div className="text-xs text-gray-500 mt-1">{subtitle}</div>
        )}
      </div>
    </div>
  );

  const formatDate = (dateString: string): string => {
    if (!dateString) return "Not provided";

    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch (error) {
      return "Invalid date";
    }
  };

  const calculateYearsOfService = (startDate: string): number => {
    if (!startDate) return 0;

    try {
      return new Date().getFullYear() - new Date(startDate).getFullYear();
    } catch (error) {
      return 0;
    }
  };

  const formatRole = (role: string): string => {
    if (!role) return "Not specified";
    return role.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  // Loading state
  if (status === "loading" || isPending) {
    return <UserProfileSkeleton />;
  }

  // Error state
  if (error && !hrData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <FaFileAlt className="text-red-600 text-2xl" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Failed to Load Profile
          </h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // No data state
  if (!hrData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <FaUser className="text-4xl text-gray-400 mb-4 mx-auto" />
          <p className="text-lg text-gray-600">No profile data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div>
        <Button variant="outline" onClick={() => router.back()}>
          Back
        </Button>
      </div>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Employee Profile
          </h1>
          <p className="text-lg text-gray-600">
            Personal Information Dashboard
          </p>
        </div>

        {/* Profile Header Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 mb-8 overflow-hidden">
          <div className="bg-gradient-to-r from-green-500 to-blue-600 px-8 py-12">
            <div className="flex flex-col md:flex-row items-center md:items-start space-y-6 md:space-y-0 md:space-x-8">
              {/* Profile Picture */}
              <div className="relative">
                <div className="w-32 h-32 rounded-full bg-white/20 backdrop-blur-sm border-4 border-white/30 flex items-center justify-center overflow-hidden">
                  {hrData.profilePicture ? (
                    <img
                      src={hrData.profilePicture}
                      alt="Profile"
                      className="w-full h-full rounded-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                        e.currentTarget.nextElementSibling?.classList.remove(
                          "hidden"
                        );
                      }}
                    />
                  ) : null}
                  <FaUser
                    size={48}
                    className={`text-white ${
                      hrData.profilePicture ? "hidden" : ""
                    }`}
                  />
                </div>
              </div>

              {/* Profile Info */}
              <div className="flex-1 text-center md:text-left">
                <h2 className="text-3xl font-bold text-white mb-2">
                  {hrData.username || "Unknown User"}
                </h2>
                <div className="inline-flex items-center space-x-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 mb-4">
                  <FaBriefcase size={16} className="text-white" />
                  <span className="text-white font-medium">
                    {formatRole(hrData.role)}
                  </span>
                </div>
                <div className="flex flex-col md:flex-row md:items-center space-y-2 md:space-y-0 md:space-x-6 text-white/90">
                  <div className="flex items-center justify-center md:justify-start space-x-2">
                    <FaEnvelope size={16} />
                    <span className="text-sm">
                      {hrData.email || "No email"}
                    </span>
                  </div>
                  <div className="flex items-center justify-center md:justify-start space-x-2">
                    <FaPhone size={16} />
                    <span className="text-sm">
                      {hrData.contact || "No contact"}
                    </span>
                  </div>
                  <div className="flex items-center justify-center md:justify-start space-x-2">
                    <FaFileAlt size={16} />
                    <span className="text-sm">ID: {hrData.empNo || "N/A"}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Personal & Contact */}
          <div className="lg:col-span-2 space-y-8">
            {/* Personal Information */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <FaUser size={20} className="text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">
                  Personal Information
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InfoCard
                  icon={FaCalendarAlt}
                  label="Date of Birth"
                  value={formatDate(hrData.dob)}
                />
                <InfoCard
                  icon={FaMapMarkerAlt}
                  label="Location"
                  value={hrData.city || "Not provided"}
                  subValue={hrData.address || undefined}
                />
                <InfoCard
                  icon={FaPhone}
                  label="Primary Contact"
                  value={hrData.contact || "Not provided"}
                />
                <InfoCard
                  icon={FaPhone}
                  label="Alternate Contact"
                  value={hrData.altContact || "Not provided"}
                />
              </div>
            </div>

            {/* Employment Details */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <FaBuilding size={20} className="text-purple-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">
                  Employment Details
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InfoCard
                  icon={FaBuilding}
                  label="Department"
                  value={hrData.store || "Not assigned"}
                />
                <InfoCard
                  icon={FaCalendarAlt}
                  label="Joining Date"
                  value={formatDate(hrData.createdAt)}
                />
                <InfoCard
                  icon={FaClock}
                  label="Work Schedule"
                  value={
                    hrData.expectedInTime && hrData.expectedOutTime
                      ? `${hrData.expectedInTime} - ${hrData.expectedOutTime}`
                      : "Not set"
                  }
                  subValue="Monday to Friday"
                />
                <InfoCard
                  icon={FaFileAlt}
                  label="Employee ID"
                  value={hrData.empNo || "Not assigned"}
                />
              </div>
            </div>

            {/* Family Information */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                  <FaUsers size={20} className="text-orange-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">
                  Emergency Contacts
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InfoCard
                  icon={FaUser}
                  label="Father"
                  value={hrData.fatherName || "Not provided"}
                  subValue={hrData.fatherPhone || undefined}
                />
                <InfoCard
                  icon={FaUser}
                  label="Mother"
                  value={hrData.motherName || "Not provided"}
                  subValue={hrData.motherPhone || undefined}
                />
              </div>
            </div>
          </div>

          {/* Right Column - Stats & Quick Info */}
          <div className="space-y-6">
            {/* Leave Balance */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">
                Leave Balance
              </h3>
              <div className="space-y-4">
                <StatCard
                  title="Annual Leave"
                  value={hrData.leaveDays ?? 0}
                  subtitle="Days remaining"
                />
                <StatCard
                  title="Comp Off"
                  value={hrData.compOff ?? 0}
                  subtitle="Days available"
                />
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">
                Quick Overview
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <span className="text-sm font-medium text-gray-600">
                      Account Status
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-green-600">
                    Active
                  </span>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    <span className="text-sm font-medium text-gray-600">
                      Years of Service
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">
                    {calculateYearsOfService(hrData.createdAt)} Years
                  </span>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                    <span className="text-sm font-medium text-gray-600">
                      Role
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">
                    {formatRole(hrData.role)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HRProfileView;
