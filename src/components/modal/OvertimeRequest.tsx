"use client";

import React, { Dispatch, SetStateAction, useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import {
  MdCalendarToday,
  MdAccessTime,
  MdDescription,
  MdClose,
  MdWarning,
} from "react-icons/md";
import { useCreateOvertimeRequest } from "@/hooks/RTKHooks";

// Types
interface OvertimeFormData {
  date: string;
  hours: number; // Ensures hours is number type
  remarks: string;
}

const OvertimeRequestForm = ({
  setIsOvertimeModalOpen,
}: {
  setIsOvertimeModalOpen: Dispatch<SetStateAction<boolean>>;
}) => {
  const [successMessage, setSuccessMessage] = useState<string>("");
  const [apiError, setApiError] = useState<string>("");

  const createOvertimeRequestMutation = useCreateOvertimeRequest();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<OvertimeFormData>({
    mode: "onChange",
    defaultValues: {
      date: "",
      hours: 0.5,
      remarks: "",
    },
  });

  const remarksValue = watch("remarks", "");

  const onSubmit: SubmitHandler<OvertimeFormData> = async (data) => {
    setApiError("");
    setSuccessMessage("");

    const payload = { ...data, hours: Number(data.hours) };

    try {
      await createOvertimeRequestMutation.mutateAsync(payload);
      setSuccessMessage("Overtime request created successfully!");
      reset();

      setTimeout(() => {
        setSuccessMessage("");
      }, 2000);
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.error ||
        error?.message ||
        "Failed to create overtime request. Please try again.";
      setApiError(errorMessage);
    }
  };

  const handleCancel = (): void => {
    reset();
    setApiError("");
    setSuccessMessage("");
    setIsOvertimeModalOpen(false);
  };

  const getMaxDate = (): string => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split("T")[0];
  };

  const getMinDate = (): string => {
    const minDate = new Date();
    minDate.setDate(minDate.getDate() - 90);
    return minDate.toISOString().split("T")[0];
  };

  return (
    <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-y-auto">
      {/* Header */}
      <div className="flex justify-between items-center p-6 border-b">
        <h2 className="text-xl font-semibold text-gray-800">
          Create Overtime Request
        </h2>
        <button
          onClick={handleCancel}
          className="text-gray-400 hover:text-gray-600"
        >
          <MdClose className="w-6 h-6" />
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
        {successMessage && (
          <div className="bg-green-100 border border-green-300 text-green-800 p-4 rounded">
            {successMessage}
          </div>
        )}
        {apiError && (
          <div className="bg-red-100 border border-red-300 text-red-800 p-4 rounded">
            {apiError}
          </div>
        )}

        {/* Date Field */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-800">
            <MdCalendarToday /> Overtime Date *
          </label>
          <input
            type="date"
            min={getMinDate()}
            max={getMaxDate()}
            {...register("date", {
              required: "Date is required",
              validate: (value) => {
                const selectedDate = new Date(value);
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                const minDate = new Date();
                minDate.setDate(minDate.getDate() - 90);
                minDate.setHours(0, 0, 0, 0);

                if (selectedDate >= today) {
                  return "Date must be in the past";
                }
                if (selectedDate < minDate) {
                  return "Date cannot be more than 90 days in the past";
                }

                return true;
              },
            })}
            className={`w-full px-3 py-2 border rounded ${
              errors.date ? "border-red-400 bg-red-50" : "border-gray-300"
            }`}
          />
          {errors.date && (
            <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
              <MdWarning /> {errors.date.message}
            </p>
          )}
        </div>

        {/* Hours Field */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-800">
            <MdAccessTime /> Number of Hours *
          </label>
          <input
            type="number"
            step="0.5"
            min="0.5"
            max="12"
            {...register("hours", {
              required: "Hours is required",
              min: {
                value: 0.5,
                message: "Minimum 0.5 hours required",
              },
              max: {
                value: 12,
                message: "Maximum 12 hours allowed",
              },
              validate: (value) => {
                if (value % 0.5 !== 0) {
                  return "Hours must be in 0.5 increments";
                }
                return true;
              },
            })}
            className={`w-full px-3 py-2 border rounded ${
              errors.hours ? "border-red-400 bg-red-50" : "border-gray-300"
            }`}
          />
          {errors.hours && (
            <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
              <MdWarning /> {errors.hours.message}
            </p>
          )}
        </div>

        {/* Remarks Field */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-800">
            <MdDescription /> Reason for Overtime *
          </label>
          <textarea
            rows={4}
            maxLength={500}
            placeholder="Please provide reason for overtime work"
            {...register("remarks", {
              required: "Remarks are required",
              minLength: {
                value: 10,
                message: "Minimum 10 characters required",
              },
              maxLength: {
                value: 500,
                message: "Maximum 500 characters allowed",
              },
              validate: (value) =>
                value.trim().length > 0 || "Remarks cannot be only whitespace",
            })}
            className={`w-full px-3 py-2 border rounded resize-none ${
              errors.remarks ? "border-red-400 bg-red-50" : "border-gray-300"
            }`}
          />
          {errors.remarks && (
            <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
              <MdWarning /> {errors.remarks.message}
            </p>
          )}
          <p className="text-xs text-gray-500">
            {remarksValue.length}/500 characters
          </p>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4">
          <button
            type="submit"
            disabled={createOvertimeRequestMutation.isPending}
            className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            {createOvertimeRequestMutation.isPending ? "Creating..." : "Submit"}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            className="border border-gray-300 px-4 py-2 rounded hover:bg-gray-100"
          >
            Cancel
          </button>
        </div>
      </form>

      <div className="px-6 py-4 bg-gray-50 border-t rounded-b">
        <p className="text-xs text-gray-500">
          * Required fields. Request will go to HR and Manager for approval.
        </p>
      </div>
    </div>
  );
};

export default OvertimeRequestForm;
