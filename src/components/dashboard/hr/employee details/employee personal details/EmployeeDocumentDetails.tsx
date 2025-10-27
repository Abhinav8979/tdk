"use client";
import React, { useState } from "react";
import {
  FaFileUpload,
  FaFilePdf,
  FaFileAlt,
  FaTimes,
  FaImage,
} from "react-icons/fa";
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
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, File>>({});

  console.log(employee);

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

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split(".").pop()?.toLowerCase();
    switch (extension) {
      case "pdf":
        return <FaFilePdf className="text-red-500 text-lg" />;
      case "jpg":
      case "jpeg":
      case "png":
      case "webp":
        return <FaImage className="text-green-500 text-lg" />;
      case "doc":
      case "docx":
        return <FaFileAlt className="text-blue-500 text-lg" />;
      default:
        return <FaFileAlt className="text-gray-500 text-lg" />;
    }
  };

  const handleFileRemove = (fieldName: string) => {
    setUploadedFiles((prev) => {
      const { [fieldName]: _, ...rest } = prev;
      return rest;
    });
    setValue(fieldName, null);
    setErrors((prev) => {
      const { [fieldName]: _, ...rest } = prev;
      return rest;
    });
  };

  const fileFields = [
    {
      label: "Aadhaar File",
      name: "aadhar_file",
      accept: ".pdf",
      existingKey: "aadhar_file",
    },
    {
      label: "PAN File",
      name: "pan_file",
      accept: ".pdf",
      existingKey: "pan_file",
    },
    {
      label: "Police Verification File",
      name: "police_verification_file",
      accept: ".pdf",
      existingKey: "police_verification_file",
    },
    {
      label: "Profile Picture",
      name: "profilePicture",
      accept: "image/*",
      existingKey: "profilePicture",
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
          {fileFields.map(({ label, name, accept, existingKey }) => {
            const existingFile = employee?.[existingKey];
            const newlyUploadedFile = uploadedFiles[name];

            return (
              <div key={name} className="flex flex-col">
                <label className="block mb-2 text-sm font-medium text-gray-700">
                  {label}
                </label>

                {/* Show existing file when not in edit mode or when no new file uploaded */}
                {!isEdit && existingFile && (
                  <div className="flex items-center gap-3 p-3 border border-[#e2e8f0] rounded-lg bg-gray-50 shadow-sm">
                    {getFileIcon(existingFile)}
                    <div className="flex-1 min-w-0">
                      <a
                        href={existingFile}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-blue-600 hover:underline truncate block"
                      >
                        {existingFile.split("/").pop()}
                      </a>
                    </div>
                  </div>
                )}

                {/* Edit mode - show upload interface */}
                {isEdit && (
                  <>
                    {/* Show existing file if available and no new file uploaded */}
                    {existingFile && !newlyUploadedFile && (
                      <div className="flex items-center gap-3 p-3 mb-2 border border-[#e2e8f0] rounded-lg bg-gray-50 shadow-sm">
                        {getFileIcon(existingFile)}
                        <div className="flex-1 min-w-0">
                          <a
                            href={existingFile}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium text-blue-600 hover:underline truncate block"
                          >
                            {existingFile.split("/").pop()}
                          </a>
                          <p className="text-xs text-gray-500 mt-1">
                            Current file
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Show newly uploaded file */}
                    {newlyUploadedFile && (
                      <div className="flex items-center gap-3 p-3 mb-2 border border-green-200 rounded-lg bg-green-50 shadow-sm">
                        {getFileIcon(newlyUploadedFile.name)}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-700 truncate">
                            {newlyUploadedFile.name}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {(newlyUploadedFile.size / 1024).toFixed(2)} KB
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleFileRemove(name)}
                          className="text-red-500 hover:text-red-700 p-1"
                        >
                          <FaTimes />
                        </button>
                      </div>
                    )}

                    {/* Upload interface */}
                    <div className="relative border-2 border-dashed border-[#b4ca01] bg-[#fcfdf5] hover:bg-[#f5f7dc] transition p-4 rounded-lg text-center cursor-pointer">
                      <label
                        htmlFor={name}
                        className="flex flex-col items-center justify-center cursor-pointer"
                      >
                        <FaFileUpload className="text-[#b4ca01] text-2xl mb-2" />
                        <p className="text-gray-700 font-medium">
                          {newlyUploadedFile
                            ? "Change file"
                            : existingFile
                            ? "Replace file"
                            : "Click to upload"}
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
                            setErrors((prev) => ({
                              ...prev,
                              [name]: errorMsg,
                            }));
                            setValue(name, null);
                            return;
                          }

                          setErrors((prev) => {
                            const { [name]: _, ...rest } = prev;
                            return rest;
                          });

                          setUploadedFiles((prev) => ({
                            ...prev,
                            [name]: file,
                          }));
                          setValue(name, file, { shouldDirty: true });
                          onFilesChange?.([file]);
                        }}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                    </div>

                    {errors[name] && (
                      <p className="mt-1 text-xs text-red-500">
                        {errors[name]}
                      </p>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* Existing Additional Docs */}
        {employee?.additionalDocuments?.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              Additional Documents
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
                        className="text-sm font-medium text-blue-600 hover:underline truncate block"
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
