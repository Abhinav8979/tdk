import React, { FC } from "react";
import { FaFemale, FaMale, FaUsers } from "react-icons/fa";
import { EmployeeDetails } from "@/types/hrDashboard.types";
import { UseFormRegister, FieldErrors } from "react-hook-form";

interface EmployeeFamilyDetailsProps {
  isEdit?: boolean;
  employee: EmployeeDetails;
  register: UseFormRegister<any>;
  errors?: FieldErrors<any>;
}

const EmployeeFamilyDetails: FC<EmployeeFamilyDetailsProps> = ({
  isEdit = false,
  employee,
  register,
  errors,
}) => {
  return (
    <>
      <div className="border-b-2 border-[#f0f4d3] px-4 sm:px-6 py-3 sm:py-4">
        <h3 className="text-lg sm:text-xl font-semibold text-[#2c2c2c] flex items-center gap-2">
          <FaUsers className="text-[#b4ca01]" /> Family Information
        </h3>
      </div>

      <div className="p-4 sm:p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
          {/* Father's Info */}
          <div className="bg-[#f8fae8] rounded-lg p-4 sm:p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <FaMale className="h-5 w-5 text-[#b4ca01]" />
              <h4 className="font-medium text-base sm:text-lg">
                Father's Information
              </h4>
            </div>
            <div className="space-y-3 ml-8">
              <div>
                <p className="text-sm text-gray-500">Name</p>
                {isEdit ? (
                  <>
                    <input
                      type="text"
                      {...register("fatherName")}
                      defaultValue={employee.fatherName || ""}
                      className={`border rounded px-2 py-1 text-sm w-full focus:outline-none focus:ring-2 transition-all ${
                        errors?.fatherName
                          ? "border-red-500 focus:ring-red-500"
                          : "border-gray-300 focus:ring-[#b4ca01]"
                      }`}
                    />
                    {errors?.fatherName && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors.fatherName.message as string}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="font-medium truncate">
                    {employee.fatherName || "N/A"}
                  </p>
                )}
              </div>
              <div>
                <p className="text-sm text-gray-500">Contact Number</p>
                {isEdit ? (
                  <>
                    <input
                      type="text"
                      {...register("fatherPhone")}
                      defaultValue={employee.fatherPhone || ""}
                      className={`border rounded px-2 py-1 text-sm w-full focus:outline-none focus:ring-2 transition-all ${
                        errors?.fatherPhone
                          ? "border-red-500 focus:ring-red-500"
                          : "border-gray-300 focus:ring-[#b4ca01]"
                      }`}
                    />
                    {errors?.fatherPhone && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors.fatherPhone.message as string}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="font-medium truncate">
                    {employee.fatherPhone || "N/A"}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Mother's Info */}
          <div className="bg-[#f8fae8] rounded-lg p-4 sm:p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <FaFemale className="h-5 w-5 text-[#b4ca01]" />
              <h4 className="font-medium text-base sm:text-lg">
                Mother's Information
              </h4>
            </div>
            <div className="space-y-3 ml-8">
              <div>
                <p className="text-sm text-gray-500">Name</p>
                {isEdit ? (
                  <>
                    <input
                      type="text"
                      {...register("motherName")}
                      defaultValue={employee.motherName || ""}
                      className={`border rounded px-2 py-1 text-sm w-full focus:outline-none focus:ring-2 transition-all ${
                        errors?.motherName
                          ? "border-red-500 focus:ring-red-500"
                          : "border-gray-300 focus:ring-[#b4ca01]"
                      }`}
                    />
                    {errors?.motherName && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors.motherName.message as string}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="font-medium truncate">
                    {employee.motherName || "N/A"}
                  </p>
                )}
              </div>
              <div>
                <p className="text-sm text-gray-500">Contact Number</p>
                {isEdit ? (
                  <>
                    <input
                      type="text"
                      {...register("motherPhone")}
                      defaultValue={employee.motherPhone || ""}
                      className={`border rounded px-2 py-1 text-sm w-full focus:outline-none focus:ring-2 transition-all ${
                        errors?.motherPhone
                          ? "border-red-500 focus:ring-red-500"
                          : "border-gray-300 focus:ring-[#b4ca01]"
                      }`}
                    />
                    {errors?.motherPhone && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors.motherPhone.message as string}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="font-medium truncate">
                    {employee.motherPhone || "N/A"}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default EmployeeFamilyDetails;
