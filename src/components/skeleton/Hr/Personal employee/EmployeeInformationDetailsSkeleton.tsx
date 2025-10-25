import React, { FC } from "react";
import { IconType } from "react-icons/lib";
import {
  FaUser,
  FaPhone,
  FaEnvelope,
  FaMapMarkerAlt,
  FaFileAlt,
  FaShieldAlt,
  FaUserCheck,
  FaUsers,
  FaClock,
  FaIdCard,
  FaBirthdayCake,
  FaFemale,
  FaMale,
} from "react-icons/fa";

// Custom Skeleton component
const Skeleton = ({ width = "100%", height = "20px", className = "" }) => (
  <div
    className={`bg-gray-200 rounded animate-pulse ${className}`}
    style={{ width, height }}
  />
);

// Skeleton Info Row Component
interface InfoRowSkeletonProps {
  Icon: IconType;
  label: string;
}

const InfoRowSkeleton: FC<InfoRowSkeletonProps> = ({ Icon, label }) => (
  <div className="flex items-start gap-3 transition-all hover:bg-gray-50 p-2 rounded-lg">
    <Icon className="h-5 w-5 mt-1 text-gray-300" />
    <div className="flex-1">
      <p className="text-sm text-gray-500">{label}</p>
      <div className="mt-1">
        <Skeleton width="120px" height="18px" />
      </div>
    </div>
  </div>
);

// Employee Information Details Skeleton
export const EmployeeInformationDetailsSkeleton = () => {
  return (
    <>
      <div className="border-b-2 border-[#f0f4d3] px-6 py-4">
        <h3 className="text-xl font-semibold text-[#2c2c2c] flex items-center gap-2">
          <FaUser className="text-[#b4ca01]" /> Employee Information
        </h3>
      </div>

      <div className="p-6">
        {/* Main Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-4">
          {/* Personal Information */}
          <InfoRowSkeleton Icon={FaEnvelope} label="Email Address" />
          <InfoRowSkeleton Icon={FaPhone} label="Contact Number" />
          <InfoRowSkeleton Icon={FaPhone} label="Alternate Contact" />
          <InfoRowSkeleton Icon={FaBirthdayCake} label="Date of Birth" />
          <InfoRowSkeleton Icon={FaMapMarkerAlt} label="Address" />
          <InfoRowSkeleton Icon={FaMapMarkerAlt} label="City" />

          {/* Employment Details */}
          <InfoRowSkeleton Icon={FaUserCheck} label="Role & Position" />
          <InfoRowSkeleton Icon={FaClock} label="Last Updated" />
          <InfoRowSkeleton Icon={FaShieldAlt} label="Police Verification" />
          <InfoRowSkeleton Icon={FaUsers} label="Reference Employee" />

          {/* Identity Documents */}
          <InfoRowSkeleton Icon={FaFileAlt} label="Government ID" />
          <InfoRowSkeleton Icon={FaIdCard} label="Aadhar Number" />
          <InfoRowSkeleton Icon={FaIdCard} label="PAN Number" />
        </div>
      </div>
    </>
  );
};