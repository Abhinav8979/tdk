"use client";
import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { FaChevronLeft } from "react-icons/fa";
import { usePutEmployeeDetails, useSearchEmployee } from "@/hooks/RTKHooks";
import Button from "@/components/ui/button/Button";
import { EmployeeDetails } from "@/types/hrDashboard.types";
import { allEmployeeDetailsPath } from "@/lib/paths";
import EmployeeDetailsHeader from "./employee personal details/EmployeeDetailsHeader";
import EmployeeStatsDetails from "./employee personal details/EmployeeStatsDetails";
import EmployeeInformationDetails from "./employee personal details/EmployeeInformationDetails";
import EmployeeFamilyDetails from "./employee personal details/EmployeeFamilyDetails";
import EmployeeDocumentDetails from "./employee personal details/EmployeeDocumentDetails";
import EmployeeDetailsHeaderSkeleton from "@/components/skeleton/Hr/Personal employee/EmployeeDetailsHeaderSkeleton";
import EmployeeStatsDetailsSkeleton from "@/components/skeleton/Hr/Personal employee/EmployeeStatsSkeleton";
import EmployeeDocumentDetailsSkeleton from "@/components/skeleton/Hr/Personal employee/EmployeeDocumentDetailsSkeleton";
import { EmployeeFamilyDetailsSkeleton } from "@/components/skeleton/Hr/Personal employee/EmployeeFamilyDetailsSkeleton";
import { EmployeeInformationDetailsSkeleton } from "@/components/skeleton/Hr/Personal employee/EmployeeInformationDetailsSkeleton";
import { useForm } from "react-hook-form";

import { toast } from "react-toastify";

// Helper function to get only changed fields
const getChangedFields = (
  original: any,
  current: any,
  hasFileChanges: boolean
): any => {
  const changes: any = {};

  // Fields to exclude from comparison (removed documents from here)
  const excludeFields = ["id"];

  // Deep comparison function
  const isEqual = (a: any, b: any): boolean => {
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (typeof a !== typeof b) return false;

    if (typeof a === "object") {
      if (Array.isArray(a) !== Array.isArray(b)) return false;

      if (Array.isArray(a)) {
        if (a.length !== b.length) return false;
        return a.every((item, index) => isEqual(item, b[index]));
      }

      const keysA = Object.keys(a);
      const keysB = Object.keys(b);
      if (keysA.length !== keysB.length) return false;

      return keysA.every(
        (key) => keysB.includes(key) && isEqual(a[key], b[key])
      );
    }

    return false;
  };

  Object.keys(current).forEach((key) => {
    // Skip excluded fields
    if (excludeFields.includes(key)) {
      return;
    }

    // Skip undefined values in current data
    if (current[key] === undefined) {
      return;
    }

    if (!isEqual(original[key], current[key])) {
      changes[key] = current[key];
    }
  });

  // Add file changes indicator
  if (hasFileChanges) {
    changes.hasDocumentChanges = true;
  }

  return changes;
};

const EmployeeDetailsPage = ({ id }: { id: string }) => {
  const router = useRouter();
  const { mutate: getEmployee } = useSearchEmployee();
  const { mutate: updateEmployee } = usePutEmployeeDetails();
  const [employee, setEmployee] = useState<EmployeeDetails | null>(null);
  const [isEdit, setIsEdit] = useState(false);

  // New state variables for file handling
  const [hasFileChanges, setHasFileChanges] = useState(false);
  const [currentFiles, setCurrentFiles] = useState<{
    aadhar_file: File | null;
    pan_file: File | null;
    police_verification_file: File | null;
    profilePicture: File | null;
    additionalDocuments: File[];
  }>({
    aadhar_file: null,
    pan_file: null,
    police_verification_file: null,
    profilePicture: null,
    additionalDocuments: [],
  });

  // Store original data for comparison
  const originalDataRef = useRef<any>(null);

  const {
    register,
    handleSubmit,
    reset,
    getValues,
    setValue,
    formState: { errors },
  } = useForm({
    // resolver: zodResolver(employeeSchema),
  });

  useEffect(() => {
    if (id) {
      getEmployee(id, {
        onSuccess: (data) => {
          setEmployee(data);

          // Store original data for comparison
          const formData = {
            ...data,
            documents: undefined, // We'll handle documents separately
          };

          originalDataRef.current = formData;
          reset(formData);
        },
      });
    }
  }, [id, getEmployee, reset]);

  // Handle file changes from document component
  const handleFilesChange = (files: File[]) => {
    // This receives all files from the document component
    // We need to organize them properly
    const organizedFiles = {
      aadhar_file: null as File | null,
      pan_file: null as File | null,
      police_verification_file: null as File | null,
      profilePicture: null as File | null,
      additionalDocuments: [] as File[],
    };

    // Get current form values to match files with their fields
    const formValues = getValues();

    // Organize files based on what's in the form
    if (formValues.aadhar_file instanceof File) {
      organizedFiles.aadhar_file = formValues.aadhar_file;
    }
    if (formValues.pan_file instanceof File) {
      organizedFiles.pan_file = formValues.pan_file;
    }
    if (formValues.police_verification_file instanceof File) {
      organizedFiles.police_verification_file =
        formValues.police_verification_file;
    }
    if (formValues.profilePicture instanceof File) {
      organizedFiles.profilePicture = formValues.profilePicture;
    }
    if (
      formValues.additionalDocuments &&
      Array.isArray(formValues.additionalDocuments)
    ) {
      organizedFiles.additionalDocuments =
        formValues.additionalDocuments.filter(
          (file: any) => file instanceof File
        );
    }

    setCurrentFiles(organizedFiles);

    // Check if there are any files
    const hasFiles = Object.values(organizedFiles).some((value) => {
      if (Array.isArray(value)) {
        return value.length > 0;
      }
      return value !== null;
    });

    setHasFileChanges(hasFiles);
  };

  const onSubmit = (data: any) => {
    console.log("Form data on submit:", data);
    console.log("Current files state:", currentFiles);

    const changedFields = getChangedFields(
      originalDataRef.current,
      data,
      hasFileChanges
    );

    console.log("Changed fields:", changedFields);

    // Exit early if no changes
    if (Object.keys(changedFields).length === 0 && !hasFileChanges) {
      toast.info("No changes detected");
      setIsEdit(false);
      return;
    }

    let payload: any;

    // Check if we have file changes or file fields in changed data
    const hasFileData =
      hasFileChanges ||
      Object.keys(changedFields).some(
        (key) =>
          key.endsWith("_file") ||
          key === "profilePicture" ||
          key === "additionalDocuments"
      ) ||
      Object.values(currentFiles).some((value) => {
        if (Array.isArray(value)) {
          return value.length > 0;
        }
        return value !== null;
      });

    if (hasFileData) {
      console.log("Creating FormData payload");
      payload = new FormData();

      // Append non-file changed fields
      Object.entries(changedFields).forEach(([key, value]) => {
        if (
          key !== "hasDocumentChanges" &&
          !(value instanceof File) &&
          !Array.isArray(value) &&
          key !== "aadhar_file" &&
          key !== "pan_file" &&
          key !== "police_verification_file" &&
          key !== "profilePicture" &&
          key !== "additionalDocuments"
        ) {
          payload.append(key, value);
        }
      });

      // Append document files - use currentFiles state and form data
      const fileFields: Array<keyof typeof currentFiles> = [
        "aadhar_file",
        "pan_file",
        "police_verification_file",
        "profilePicture",
      ];

      fileFields.forEach((field) => {
        // Check both currentFiles state and form data
        const fileFromState = currentFiles[field];
        const fileFromForm = data[field];

        const file =
          fileFromForm instanceof File ? fileFromForm : fileFromState;

        if (file instanceof File) {
          console.log(`Appending file for ${field}:`, file.name);
          payload.append(field, file);
        }
      });

      // Handle additional documents
      const additionalDocs =
        data.additionalDocuments || currentFiles.additionalDocuments || [];
      if (Array.isArray(additionalDocs) && additionalDocs.length > 0) {
        additionalDocs.forEach((file: File, index: number) => {
          if (file instanceof File) {
            console.log(`Appending additional document ${index}:`, file.name);
            payload.append(`additionalDocuments`, file);
          }
        });
      }

      // Log FormData contents for debugging
      console.log("FormData contents:");
      for (let [key, value] of payload.entries()) {
        console.log(key, value);
      }
    } else {
      // No files, just plain JSON
      payload = { ...changedFields };
      delete payload.hasDocumentChanges;
    }

    console.log(payload);

    // Submit
    updateEmployee(
      { id, data: payload },
      {
        onSuccess: () => {
          setIsEdit(false);
          setHasFileChanges(false);
          setCurrentFiles({
            aadhar_file: null,
            pan_file: null,
            police_verification_file: null,
            profilePicture: null,
            additionalDocuments: [],
          });

          // Update local reference for future change detection
          const updatedFields = { ...changedFields };
          delete updatedFields.hasDocumentChanges;

          originalDataRef.current = {
            ...originalDataRef.current,
            ...updatedFields,
          };

          toast.success("Updated Successfully..");

          // Refresh
          window.location.reload();
        },
        onError: (error) => {
          console.error("Update error:", error);
          toast.error(typeof error === "string" ? error : "Update failed");
          setIsEdit(false);
        },
      }
    );
  };

  const handleCancel = () => {
    if (originalDataRef.current) {
      reset(originalDataRef.current);
    }
    setIsEdit(false);
    setHasFileChanges(false);
    setCurrentFiles({
      aadhar_file: null,
      pan_file: null,
      police_verification_file: null,
      profilePicture: null,
      additionalDocuments: [],
    });
  };

  return (
    <div className="text-[#2c2c2c] w-full px-4 sm:px-6 md:px-8 py-4">
      {/* Back button */}
      <button
        onClick={() => router.push(allEmployeeDetailsPath)}
        className="flex items-center mb-4 sm:mb-6 cursor-pointer text-gray-600 hover:text-[#b4ca01] transition-colors text-sm sm:text-base"
      >
        <FaChevronLeft className="mr-1" /> Back to Employees
      </button>

      <main className="max-w-7xl mx-auto">
        <form onSubmit={handleSubmit(onSubmit)}>
          {/* Header Card */}
          <div className="rounded-xl shadow-md overflow-hidden mb-6 sm:mb-8">
            <div className="p-4 sm:p-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 sm:gap-6">
                {employee ? (
                  <EmployeeDetailsHeader employee={employee} />
                ) : (
                  <EmployeeDetailsHeaderSkeleton />
                )}

                {isEdit ? (
                  <div className="grid grid-cols-2 gap-3 w-full md:flex md:gap-4 md:w-auto">
                    <button
                      type="button"
                      onClick={handleCancel}
                      className="w-full md:w-auto bg-[var(--primary-background)] hover:brightness-90 text-white cursor-pointer inline-flex items-center justify-center scale-95 md:scale-100  font-semibold rounded-lg transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="w-full md:w-auto bg-[var(--primary-background)] hover:brightness-90 text-white cursor-pointer inline-flex items-center justify-center scale-95 md:scale-100  font-semibold rounded-lg transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed"
                    >
                      Save
                    </button>
                  </div>
                ) : (
                  <div className="w-full md:w-auto">
                    <button
                      type="button"
                      onClick={() => setIsEdit(true)}
                      className="p-2 md:w-auto bg-[var(--primary-background)] hover:brightness-90 text-white cursor-pointer inline-flex items-center justify-center scale-95 md:scale-100  font-semibold rounded-lg transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed"
                    >
                      Edit Profile
                    </button>
                  </div>
                )}
              </div>

              {/* Unsaved changes indicator */}
              {isEdit &&
                (hasFileChanges ||
                  Object.keys(
                    getChangedFields(
                      originalDataRef.current || {},
                      getValues(),
                      hasFileChanges
                    )
                  ).length > 0) && (
                  <div className="mt-4 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-yellow-800 text-xs sm:text-sm">
                      You have unsaved changes. Click Save to update or Cancel
                      to discard.
                    </p>
                  </div>
                )}
            </div>
          </div>

          {/* Stats Summary */}
          <div className="mb-6 sm:mb-8">
            {employee ? (
              <EmployeeStatsDetails employee={employee} />
            ) : (
              <EmployeeStatsDetailsSkeleton />
            )}
          </div>

          {/* Information Section */}
          <div className="mb-6 sm:mb-8">
            <div className="rounded-xl shadow-md overflow-hidden">
              {employee ? (
                <EmployeeInformationDetails
                  isEdit={isEdit}
                  employee={employee}
                  register={register}
                />
              ) : (
                <EmployeeInformationDetailsSkeleton />
              )}
            </div>
          </div>

          {/* Family + Documents (Two Column for Desktop) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-xl shadow-md overflow-hidden">
              {employee ? (
                <EmployeeFamilyDetails
                  register={register}
                  isEdit={isEdit}
                  employee={employee}
                  errors={errors}
                />
              ) : (
                <EmployeeFamilyDetailsSkeleton />
              )}
            </div>

            <div className="rounded-xl shadow-md overflow-hidden">
              {employee ? (
                <EmployeeDocumentDetails
                  employee={employee}
                  isEdit={isEdit}
                  register={register}
                  setValue={setValue}
                  onFilesChange={handleFilesChange}
                />
              ) : (
                <EmployeeDocumentDetailsSkeleton />
              )}
            </div>
          </div>
        </form>
      </main>
    </div>
  );
};

export default EmployeeDetailsPage;
