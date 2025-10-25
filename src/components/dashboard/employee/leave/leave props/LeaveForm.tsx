"use client";

import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import InputField from "@/components/ui/InputField/InputField";
import { LeaveFormValues } from "@/types/modal.types";
import { calculateDays } from "@/utils/helperFunctions";
import Button from "@/components/ui/button/Button";
import { AiOutlineClose } from "react-icons/ai";
import { useCreateLeave } from "@/hooks/RTKHooks";
import SecondaryLoader from "@/components/loader/SecondaryLoader";

export default function LeaveForm() {
  const [days, setDays] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [isStartHalf, setIsStartHalf] = useState(false);
  const [isEndHalf, setIsEndHalf] = useState(false);
  const [dateError, setDateError] = useState("");

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<LeaveFormValues>({
    defaultValues: {
      startDate: "",
      endDate: "",
      reason: "",
    },
  });

  const { mutate: createLeave, isPending } = useCreateLeave();

  const startDate = watch("startDate");
  const endDate = watch("endDate");
  const reason = watch("reason");

  const formRef = useRef<HTMLDivElement>(null);

  const [halfDayAt, setHalfDayAt] = useState<"start" | "end" | null>(null);

  useEffect(() => {
    if (startDate && endDate) {
      if (endDate < startDate) {
        setDateError("End date cannot be before start date.");
        setDays(0);
      } else {
        setDateError("");
        let totalDays = calculateDays(startDate, endDate);
        if (halfDayAt) totalDays -= 0.5;
        setDays(totalDays);
      }
    } else {
      setDays(0);
      setDateError("");
    }
  }, [startDate, endDate, halfDayAt]);

  useEffect(() => {
    setIsStartHalf(halfDayAt === "start");
    setIsEndHalf(halfDayAt === "end");
  }, [halfDayAt]);

  const onSubmit = (data: LeaveFormValues) => {
    if (endDate < startDate) {
      setDateError("End date cannot be before start date.");
      return;
    }

    const leaveData: any = {
      startDate: startDate,
      endDate: endDate,
      reason: reason,
    };

    // Add half-day information based on selection
    if (halfDayAt === "start") {
      leaveData.isHalfDayStart = true;
      leaveData.isHalfDayEnd = false;
      leaveData.startHalfPeriod = "first_half";
    } else if (halfDayAt === "end") {
      leaveData.isHalfDayStart = false;
      leaveData.isHalfDayEnd = true;
      leaveData.endHalfPeriod = "second_half";
    } else {
      leaveData.isHalfDayStart = false;
      leaveData.isHalfDayEnd = false;
    }

    createLeave(leaveData, {
      onSuccess: (responseData) => {
        setSubmitted(true);
      },
      onError: (error) => {
        console.error("Error submitting leave:", error);
      },
    });
  };

  const handleCloseModal = () => {
    const url = new URL(window.location.href);
    url.search = "";
    window.location.href = url.toString();
  };

  const handleClickOutside = (e: React.MouseEvent<HTMLDivElement>) => {
    if (formRef.current && !formRef.current.contains(e.target as Node)) {
      handleCloseModal();
    }
  };

  const resetForm = () => {
    reset();
    setDays(0);
    setSubmitted(false);
    setIsStartHalf(false);
    setIsEndHalf(false);
    setHalfDayAt(null);
    setDateError("");
  };

  return (
    <div
      onClick={handleClickOutside}
      // className="fixed inset-0  bg-opacity-50 flex items-center justify-center p-4 z-50"
    >
      <div
        ref={formRef}
        className="bg-white relative rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto p-4 sm:p-6"
      >
        <div className="flex justify-end mb-2">
          <AiOutlineClose
            className="cursor-pointer text-gray-500 hover:text-gray-700"
            onClick={handleCloseModal}
            size={24}
          />
        </div>

        {!submitted ? (
          <>
            <div className="mb-6 sm:mb-8">
              <h2 className="text-xl sm:text-2xl font-bold text-[var(--foreground)] mb-2">
                Request Leave
              </h2>
              <div className="flex items-center">
                <div className="h-1 w-8 sm:w-10 bg-[var(--primary-background)] rounded"></div>
                <p className="ml-3 text-xs sm:text-sm text-[var(--foreground)/70]">
                  Complete the form below to submit your leave request
                </p>
              </div>
            </div>

            <form
              onSubmit={handleSubmit(onSubmit)}
              className="space-y-4 sm:space-y-6"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <label className="block mb-1 font-medium text-sm text-gray-700">
                    Start Date
                  </label>
                  <InputField
                    name="startDate"
                    type="date"
                    register={register("startDate", {
                      required: "Start Date is required",
                    })}
                    error={errors.startDate}
                  />
                </div>

                <div>
                  <label className="block mb-1 font-medium text-sm text-gray-700">
                    End Date
                  </label>
                  <InputField
                    name="endDate"
                    type="date"
                    register={register("endDate", {
                      required: "End Date is required",
                    })}
                    error={errors.endDate}
                  />
                </div>
              </div>

              {dateError && (
                <p className="text-red-500 text-sm mt-2">{dateError}</p>
              )}

              <div className="mt-4">
                <label className="block mb-2 font-medium text-sm text-gray-700">
                  Half Day
                </label>
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-start sm:items-center text-sm text-gray-600">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="halfDay"
                      checked={halfDayAt === "start"}
                      onChange={() => setHalfDayAt("start")}
                      className="mr-2"
                    />
                    <span className="whitespace-nowrap">
                      1st Half (Start Date)
                    </span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="halfDay"
                      checked={halfDayAt === "end"}
                      onChange={() => setHalfDayAt("end")}
                      className="mr-2"
                    />
                    <span className="whitespace-nowrap">
                      2nd Half (End Date)
                    </span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="halfDay"
                      checked={halfDayAt === null}
                      onChange={() => setHalfDayAt(null)}
                      className="mr-2"
                    />
                    <span>None</span>
                  </label>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {halfDayAt === "start" &&
                    "Taking first half of start date as leave"}
                  {halfDayAt === "end" &&
                    "Taking second half of end date as leave"}
                  {halfDayAt === null && "Full days"}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium text-[var(--foreground)/70] uppercase tracking-wider mb-1">
                  Total Duration
                </p>
                <p className="text-[var(--foreground)] font-medium">
                  {days ?? "0"} day{days !== 1 ? "s" : ""}
                </p>
              </div>

              <div>
                <label className="block mb-1 font-medium text-sm text-gray-700">
                  Reason
                </label>
                <div className="relative">
                  {errors.reason && (
                    <p className="text-red-500 text-sm my-1 ml-2">
                      {errors.reason.message}
                    </p>
                  )}
                  <textarea
                    id="reason"
                    {...register("reason", { required: "Reason is required" })}
                    className="w-full p-3 sm:p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--primary-background)] focus:border-[var(--primary-background)] h-24 sm:h-32 focus:outline-none bg-gray-50 placeholder-gray-400 text-sm sm:text-base resize-none"
                    placeholder="Please provide detailed reason for your leave request..."
                  />
                </div>
              </div>

              <div className="flex justify-center sm:justify-end mt-6 pt-4 border-t border-gray-100">
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  className="w-full sm:w-auto min-w-[120px]"
                >
                  {isPending ? <SecondaryLoader /> : "Submit"}
                </Button>
              </div>
            </form>
          </>
        ) : (
          <div className="p-0">
            <div className="px-0 py-4 border-b border-green-200 mb-4">
              <div className="flex items-center">
                <h3 className="text-lg sm:text-xl font-semibold text-[var(--foreground)]">
                  Leave Request Submitted Successfully
                </h3>
              </div>
            </div>

            <div className="space-y-4 sm:space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <p className="text-xs font-medium text-[var(--foreground)/70] uppercase tracking-wider mb-1">
                    Start Date
                  </p>
                  <p className="text-[var(--foreground)] font-medium text-sm sm:text-base">
                    {startDate} {isStartHalf && "(1st Half)"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-[var(--foreground)/70] uppercase tracking-wider mb-1">
                    End Date
                  </p>
                  <p className="text-[var(--foreground)] font-medium text-sm sm:text-base">
                    {endDate} {isEndHalf && "(2nd Half)"}
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-xs font-medium text-[var(--foreground)/70] uppercase tracking-wider mb-1">
                    Total Duration
                  </p>
                  <p className="text-[var(--foreground)] font-medium text-sm sm:text-base">
                    {days} day{days !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-[var(--foreground)/70] uppercase tracking-wider mb-1">
                  Reason
                </p>
                <p className="text-[var(--foreground)] text-sm sm:text-base leading-relaxed">
                  {reason}
                </p>
              </div>

              <div className="flex justify-center sm:justify-end pt-4 border-t border-gray-100">
                <Button
                  variant="primary"
                  size="md"
                  onClick={resetForm}
                  className="w-full sm:w-auto"
                >
                  Submit Another Request
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
