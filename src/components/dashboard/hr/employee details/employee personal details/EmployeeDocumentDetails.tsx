"use client";
import React, { useState } from "react";
import { FaFileUpload, FaFilePdf, FaFileAlt, FaTimes } from "react-icons/fa";
import { UseFormRegister, UseFormSetValue } from "react-hook-form";

interface Props {
  isEdit?: boolean;
  register: UseFormRegister<any>;
  setValue: UseFormSetValue<any>;
  onFilesChange?: (files: File[]) => void;
  employee?: any;
}

const EmployeeDocumentDetails: React.FC<Props> = ({
  isEdit = false,
  register,
  setValue,
  onFilesChange,
  employee,
}) => {
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ✅ File validation rules
  const allowedPdfTypes = ["application/pdf"];
  const allowedImageTypes = ["image/jpeg", "image/png", "image/webp"];
  const maxPdfSize = 5 * 1024 * 1024; // 5MB
  const maxImageSize = 2 * 1024 * 1024; // 2MB

  const validateFile = (file: File, fieldName: string): string | null => {
    if (!file) return null;

    if (fieldName === "profilePicture") {
      if (!allowedImageTypes.includes(file.type)) {
        return "Only JPG, PNG, WEBP images are allowed.";
      }
      if (file.size > maxImageSize) {
        return "Image size must be less than 2MB.";
      }
    } else {
      if (!allowedPdfTypes.includes(file.type)) {
        return "Only PDF files are allowed.";
      }
      if (file.size > maxPdfSize) {
        return "PDF size must be less than 5MB.";
      }
    }
    return null;
  };

  // ✅ Helper UI
  const getFileIcon = (fileName: string) => {
    const extension = fileName.split(".").pop()?.toLowerCase();
    switch (extension) {
      case "pdf":
        return <FaFilePdf className="text-red-500 text-lg" />;
      case "doc":
      case "docx":
        return <FaFileAlt className="text-blue-500 text-lg" />;
      default:
        return <FaFileAlt className="text-gray-500 text-lg" />;
    }
  };

  const fileFields = [
    { label: "Aadhaar File", name: "aadhar_file", accept: ".pdf" },
    { label: "PAN File", name: "pan_file", accept: ".pdf" },
    {
      label: "Police Verification File",
      name: "police_verification_file",
      accept: ".pdf",
    },
    {
      label: "Profile Picture",
      name: "profilePicture",
      accept: "image/*",
    },
  ] as const;

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden border border-[#f0f4d3]">
      <div className="bg-[#f8fae8] px-4 sm:px-6 py-3 sm:py-4 border-b border-[#f0f4d3]">
        <h3 className="text-lg sm:text-xl font-semibold text-[#2c2c2c] flex items-center gap-2">
          <FaFileUpload className="text-[#b4ca01]" /> Upload Documents
        </h3>
      </div>

      <div className="p-4 sm:p-6 space-y-6">
        {/* File Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {fileFields.map(({ label, name, accept }) => (
            <div key={name} className="flex flex-col">
              <label className="block mb-2 text-sm font-medium text-gray-700">
                {label}
              </label>

              {isEdit && (
                <>
                  <div className="relative border-2 border-dashed border-[#b4ca01] bg-[#fcfdf5] hover:bg-[#f5f7dc] transition p-4 rounded-lg text-center cursor-pointer">
                    <label
                      htmlFor={name}
                      className="flex flex-col items-center justify-center cursor-pointer"
                    >
                      <FaFileUpload className="text-[#b4ca01] text-2xl mb-2" />
                      <p className="text-gray-700 font-medium">
                        Click to upload
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {name === "profilePicture"
                          ? "(JPG, PNG, WEBP | Max 2MB)"
                          : "(PDF | Max 5MB)"}
                      </p>
                    </label>
                    <input
                      type="file"
                      id={name}
                      accept={accept}
                      {...register(name)}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;

                        const errorMsg = validateFile(file, name);
                        if (errorMsg) {
                          setErrors((prev) => ({ ...prev, [name]: errorMsg }));
                          setValue(name, null);
                          return;
                        }

                        setErrors((prev) => {
                          const { [name]: _, ...rest } = prev;
                          return rest;
                        });

                        setValue(name, file, { shouldDirty: true });
                        onFilesChange?.([file]);
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                  </div>

                  {errors[name] && (
                    <p className="mt-1 text-xs text-red-500">{errors[name]}</p>
                  )}
                </>
              )}
            </div>
          ))}
        </div>

        {/* Existing Additional Docs */}
        {!isEdit && employee?.additionalDocuments?.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              Existing Additional Documents
            </h4>
            <div className="space-y-2">
              {employee.additionalDocuments.map(
                (url: string, index: number) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 border border-[#e2e8f0] rounded-lg bg-white shadow-sm min-w-0"
                  >
                    {getFileIcon(url)}
                    <div className="flex-1 min-w-0">
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-blue-600 hover:underline truncate"
                      >
                        {url.split("/").pop()}
                      </a>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeeDocumentDetails;
