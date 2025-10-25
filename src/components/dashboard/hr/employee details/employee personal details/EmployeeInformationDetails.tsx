import React, { FC, useState } from "react";
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
} from "react-icons/fa";
import { formatDate } from "@/utils/helperFunctions";
import { EmployeeDetails } from "@/types/hrDashboard.types";
import { UseFormRegister } from "react-hook-form";

interface InfoRowProps {
  Icon: IconType;
  label: string;
  value?: string | number | null;
  isEdit?: boolean;
  name?: string;
  register?: UseFormRegister<any>;
  customInput?: React.ReactNode; // 👈 NEW
}

const InfoRow: FC<InfoRowProps> = ({
  Icon,
  label,
  value,
  isEdit,
  name,
  register,
  customInput,
}) => (
  <div className="flex items-start gap-3 transition-all hover:bg-gray-50 p-2 rounded-lg">
    <Icon className="h-5 w-5 mt-1 text-[#b4ca01]" />
    <div className="flex-1">
      <p className="text-sm text-gray-500">{label}</p>
      {isEdit && name && register && !customInput ? (
        <input
          type="text"
          {...register(name)}
          className="border border-gray-300 rounded px-2 py-1 text-sm w-full focus:outline-none focus:ring-2 focus:ring-[#b4ca01] transition-all"
        />
      ) : customInput ? (
        customInput // 👈 Render custom input if provided
      ) : (
        <p className="font-medium">{value ?? "N/A"}</p>
      )}
    </div>
  </div>
);

interface EmployeeInformationDetailsProps {
  employee: EmployeeDetails;
  isEdit?: boolean;
  register?: UseFormRegister<any>; // Accept register as a prop
}

const EmployeeInformationDetails: FC<EmployeeInformationDetailsProps> = ({
  employee,
  isEdit = false,
  register,
}) => {
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  return (
    <>
      <>
        <div className="border-b-2 border-[#f0f4d3] px-4 sm:px-6 py-3 sm:py-4">
          <h3 className="text-lg sm:text-xl font-semibold text-[#2c2c2c] flex items-center gap-2">
            <FaUser className="text-[#b4ca01]" /> Employee Information
          </h3>
        </div>

        <div className="p-4 sm:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-6">
            <InfoRow
              Icon={FaEnvelope}
              label="Email Address"
              value={employee.email}
              name="email"
              isEdit={isEdit}
              register={register}
            />
            <InfoRow
              Icon={FaPhone}
              label="Contact Number"
              value={employee.contact}
              name="contact"
              isEdit={isEdit}
              register={register}
            />
            <InfoRow
              Icon={FaPhone}
              label="Alternate Contact"
              value={employee.altContact}
              name="altContact"
              isEdit={isEdit}
              register={register}
            />
            <InfoRow
              Icon={FaBirthdayCake}
              label="Date of Birth"
              value={formatDate(employee.dob)}
              name="dob"
              isEdit={isEdit}
              customInput={
                isEdit && register ? (
                  <input
                    type="date"
                    {...register("dob")}
                    defaultValue={employee.dob?.split("T")[0]}
                    className="border border-gray-300 rounded px-2 py-1 text-sm w-full focus:outline-none focus:ring-2 focus:ring-[#b4ca01] transition-all"
                  />
                ) : undefined
              }
            />

            <InfoRow
              Icon={FaMapMarkerAlt}
              label="Address"
              value={employee.address}
              name="address"
              isEdit={isEdit}
              register={register}
            />
            <InfoRow
              Icon={FaMapMarkerAlt}
              label="City"
              value={employee.city}
              name="city"
              isEdit={isEdit}
              register={register}
            />
            <InfoRow
              Icon={FaUserCheck}
              label="Role & Position"
              value={`${employee.role || "N/A"} - ${
                employee.userType || "N/A"
              }`}
              isEdit={false}
            />

            {/* Police Verification */}
            <InfoRow
              Icon={FaShieldAlt}
              label="Police Verification"
              value={employee.police_verification}
              isEdit={isEdit}
              name="police_verification"
              register={register}
              customInput={
                isEdit ? (
                  employee.police_verification || uploadedFileName ? (
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm">
                      {employee.police_verification && (
                        <a
                          href={employee.police_verification}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 underline flex items-center gap-1 truncate"
                        >
                          <FaFileAlt className="text-[#b4ca01]" /> View File
                        </a>
                      )}
                      {uploadedFileName && (
                        <div className="flex items-center gap-1 text-gray-700 truncate">
                          <FaFileAlt className="text-[#b4ca01]" />
                          <span className="truncate max-w-[150px]">
                            {uploadedFileName}
                          </span>
                        </div>
                      )}
                      <label
                        htmlFor="police_verification"
                        className="ml-0 sm:ml-2 cursor-pointer text-sm text-[#b4ca01] underline"
                      >
                        Replace
                      </label>
                      <input
                        type="file"
                        id="police_verification"
                        name="police_verification"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) setUploadedFileName(file.name);
                        }}
                      />
                    </div>
                  ) : (
                    <div className="relative w-full">
                      <input
                        type="file"
                        name="police_verification"
                        id="police_verification"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) setUploadedFileName(file.name);
                        }}
                      />
                      <label
                        htmlFor="police_verification"
                        className="flex items-center whitespace-nowrap justify-center gap-2 cursor-pointer border border-dashed border-gray-300 rounded px-4 py-2 text-sm text-gray-600 hover:border-[#b4ca01] hover:text-[#b4ca01] transition-all"
                      >
                        <FaFileAlt className="text-[#b4ca01]" />
                        Upload Police Verification
                      </label>
                    </div>
                  )
                ) : undefined
              }
            />

            <InfoRow
              Icon={FaUsers}
              label="Reference Employee"
              value={employee.referenceEmployee}
              name="referenceEmployee"
              isEdit={isEdit}
              register={register}
            />
            <InfoRow
              Icon={FaFileAlt}
              label="Government ID"
              value={employee.govtID}
              name="govtID"
              isEdit={isEdit}
              register={register}
            />
            <InfoRow
              Icon={FaIdCard}
              label="Aadhar Number"
              value={employee.aadhar_number}
              name="aadhar_number"
              isEdit={isEdit}
              register={register}
            />
            <InfoRow
              Icon={FaIdCard}
              label="PAN Number"
              value={employee.pan_number}
              name="pan_number"
              isEdit={isEdit}
              register={register}
            />
          </div>
        </div>
      </>
    </>
  );
};

export default EmployeeInformationDetails;
