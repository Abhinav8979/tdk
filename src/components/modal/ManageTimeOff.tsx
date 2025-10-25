"use client";
import { useGetStoreEmployess, useUpdateTimeOffs } from "@/hooks/RTKHooks";
import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import {
  LuX,
  LuClock,
  LuCalendar,
  LuCheck,
  LuLoader,
  LuSettings,
  LuStore,
} from "react-icons/lu";
import { toast } from "react-toastify";

interface FormData {
  inTime: string;
  outTime: string;
  inThresholdMinutes: number;
  outThresholdMinutes: number;
  leaveDay: string;
  selectedStoreId?: string;
  name: string;
}

interface TimeThresholdModalProps {
  onClose: () => void;
}

interface WeekDay {
  value: string;
  label: string;
}

interface Store {
  id: string;
  name: string;
  lateEntryThreshold?: number;
  earlyExitThreshold?: number;
  expectedInTime?: string;
  expectedOutTime?: string;
  calendar?: {
    weekdayOff?: string;
  };
}

// Define payload interfaces to fix TypeScript errors
interface TimePayload {
  expectedInTime?: string;
  expectedOutTime?: string;
  lateEntryThreshold?: number;
  earlyExitThreshold?: number;
  storeName?: string | null | undefined;
}

interface CalendarPayload {
  weekdayOff: string | undefined;
  storeName?: string | null | undefined;
}

export default function TimeThresholdModal({
  onClose,
}: TimeThresholdModalProps) {
  const [isOpen, setIsOpen] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [formData, setFormData] = useState<FormData>({
    inTime: "",
    outTime: "",
    inThresholdMinutes: 15,
    outThresholdMinutes: 30,
    leaveDay: "",
    selectedStoreId: "",
    name: "",
  });

  const { mutate: updateTimeOffs } = useUpdateTimeOffs();
  const { data: storeData, isPending } = useGetStoreEmployess();

  const { data: session } = useSession();

  const isAdminUser = session?.user?.profile === "md";
  const stores: Store[] = storeData?.stores || [];

  const weekdays: WeekDay[] = [
    { value: "Monday", label: "Monday" },
    { value: "Tuesday", label: "Tuesday" },
    { value: "Wednesday", label: "Wednesday" },
    { value: "Thursday", label: "Thursday" },
    { value: "Friday", label: "Friday" },
    { value: "Saturday", label: "Saturday" },
    { value: "Sunday", label: "Sunday" },
  ];

  const extractTimeFromDateTime = (dateTimeString: any) => {
    if (!dateTimeString) return "00:00";

    try {
      // Parse the datetime string and extract time in HH:MM format
      const date = new Date(dateTimeString);

      // Check if date is valid
      if (isNaN(date.getTime())) {
        // If invalid date, try to extract time part directly from string
        const timeMatch = dateTimeString.match(/T(\d{2}:\d{2})/);
        return timeMatch ? timeMatch[1] : "00:00";
      }

      // Format time as HH:MM
      return date.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    } catch (error) {
      console.error("Error parsing time:", error);
      return "00:00";
    }
  };

  // Effect to populate form data when store is selected
  useEffect(() => {
    if (formData.selectedStoreId && stores.length > 0) {
      const selectedStore = stores.find(
        (store) => store.id === formData.selectedStoreId
      );
      console.log(selectedStore);
      if (selectedStore) {
        setFormData((prev) => ({
          ...prev,
          inTime:
            extractTimeFromDateTime(selectedStore.expectedInTime) || "00:00",
          outTime:
            extractTimeFromDateTime(selectedStore.expectedOutTime) || "00:00",
          inThresholdMinutes: selectedStore.lateEntryThreshold || 15,
          outThresholdMinutes: selectedStore.earlyExitThreshold || 30,
          leaveDay: selectedStore.calendar?.weekdayOff || "",
          name: selectedStore.name,
        }));
      }
    }
  }, [formData.selectedStoreId, stores]);
  // Effect to set default store for non-admin users
  useEffect(() => {
    if (!isAdminUser && stores.length > 0) {
      // For non-admin users, automatically select the first/only store
      const defaultStore = stores[0];
      setFormData((prev) => ({
        ...prev,
        selectedStoreId: defaultStore.id,
      }));
    }
  }, [isAdminUser, stores]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === "inThresholdMinutes" || name === "outThresholdMinutes"
          ? Number(value) || 0
          : value,
    }));
  };

  // Special handler for number inputs to prevent the reset bug
  const handleNumberBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const numValue = parseInt(value) || 1;

    // Apply field-specific constraints
    let constrainedValue = numValue;
    if (name === "inThresholdMinutes") {
      constrainedValue = Math.max(0, Math.min(120, numValue));
    } else if (name === "outThresholdMinutes") {
      constrainedValue = Math.max(0, Math.min(480, numValue));
    }

    setFormData((prev) => ({
      ...prev,
      [name]: constrainedValue,
    }));
  };

  const handleSubmit = async (): Promise<void> => {
    if (!formData.selectedStoreId) {
      toast.error("Please select a store");
      return;
    }

    setIsLoading(true);

    try {
      const {
        inTime,
        outTime,
        inThresholdMinutes,
        outThresholdMinutes,
        leaveDay,
        // selectedStoreId,
      } = formData;

      // First payload for time settings
      const timePayload: TimePayload = {
        ...(isAdminUser && { storeName: formData.name }),
        expectedInTime: inTime || undefined,
        expectedOutTime: outTime || undefined,
        lateEntryThreshold: inThresholdMinutes || undefined,
        earlyExitThreshold: outThresholdMinutes || undefined,
      };

      updateTimeOffs(
        { action: "times", payload: timePayload },
        {
          onError: () => {
            toast.error("Something Went Wrong!!!");
          },
        }
      );

      // Second payload for calendar settings
      const calendarPayload: CalendarPayload = {
        ...(isAdminUser && { storeName: formData.name }),
        weekdayOff: leaveDay || undefined,
      };

      updateTimeOffs(
        { action: "calendar", payload: calendarPayload },
        {
          onSuccess: () => {
            toast.success("Updated Successfully!");
            setIsOpen(false);
            onClose();
          },
          onError: () => {
            toast.error("Something Went Wrong!!!");
          },
        }
      );
    } catch (error) {
      toast.error("Something Went Wrong!!!");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = (): void => {
    setIsOpen(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden border border-gray-200">
        {/* Header */}
        <div className="px-6 py-5" style={{ backgroundColor: "#b4ca01" }}>
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-white/30 rounded-lg">
                <LuSettings className="w-6 h-6" style={{ color: "#2c2c2c" }} />
              </div>
              <div>
                <h2
                  className="text-xl font-semibold"
                  style={{ color: "#2c2c2c" }}
                >
                  Time & Leave Management
                </h2>
                <p className="text-sm opacity-70" style={{ color: "#2c2c2c" }}>
                  Configure working hours and leave policies
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors duration-200"
              disabled={isLoading}
              aria-label="Close modal"
            >
              <LuX className="w-6 h-6" style={{ color: "#2c2c2c" }} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div
          className="p-6 max-h-[calc(90vh-140px)] overflow-y-auto"
          style={{ backgroundColor: "#fafcf0" }}
        >
          <div className="space-y-8">
            {/* Store Selection Section - Only for MD profile */}
            {isAdminUser && (
              <div
                className="rounded-xl p-6 shadow-sm border border-gray-200"
                style={{ backgroundColor: "#e4ecaa" }}
              >
                <div className="flex items-center mb-6">
                  <div
                    className="p-2 rounded-lg mr-3"
                    style={{ backgroundColor: "#b4ca01" }}
                  >
                    <LuStore className="w-5 h-5" style={{ color: "#2c2c2c" }} />
                  </div>
                  <div>
                    <h3
                      className="text-lg font-semibold"
                      style={{ color: "#2c2c2c" }}
                    >
                      Store Selection
                    </h3>
                    <p
                      className="text-sm"
                      style={{ color: "#2c2c2c", opacity: 0.7 }}
                    >
                      Select store to configure settings
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="selectedStoreId"
                    className="block text-sm font-medium mb-1"
                    style={{ color: "#2c2c2c" }}
                  >
                    Select Store
                  </label>
                  <select
                    id="selectedStoreId"
                    name="selectedStoreId"
                    value={formData.selectedStoreId}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 transition-all duration-200"
                    style={{ backgroundColor: "white" }}
                    disabled={isLoading || isPending}
                  >
                    <option value="">Select a store</option>
                    {stores.map((store) => (
                      <option key={store.id} value={store.id}>
                        {store.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Time Settings Section */}
            <div
              className="rounded-xl p-6 shadow-sm border border-gray-200"
              style={{ backgroundColor: "#e4ecaa" }}
            >
              <div className="flex items-center mb-6">
                <div
                  className="p-2 rounded-lg mr-3"
                  style={{ backgroundColor: "#b4ca01" }}
                >
                  <LuClock className="w-5 h-5" style={{ color: "#2c2c2c" }} />
                </div>
                <div>
                  <h3
                    className="text-lg font-semibold"
                    style={{ color: "#2c2c2c" }}
                  >
                    Working Hours
                  </h3>
                  <p
                    className="text-sm"
                    style={{ color: "#2c2c2c", opacity: 0.7 }}
                  >
                    Set standard working hours and threshold times
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label
                    htmlFor="inTime"
                    className="block text-sm font-medium mb-1"
                    style={{ color: "#2c2c2c" }}
                  >
                    Check-in Time (24 Hour format)
                  </label>
                  <input
                    id="inTime"
                    type="time"
                    name="inTime"
                    value={formData.inTime}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 transition-all duration-200"
                    style={{
                      backgroundColor: "white",
                    }}
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="outTime"
                    className="block text-sm font-medium mb-1"
                    style={{ color: "#2c2c2c" }}
                  >
                    Check-out Time (24 Hour format)
                  </label>
                  <input
                    id="outTime"
                    type="time"
                    name="outTime"
                    value={formData.outTime}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 transition-all duration-200"
                    style={{ backgroundColor: "white" }}
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="inThresholdMinutes"
                    className="block text-sm font-medium mb-1"
                    style={{ color: "#2c2c2c" }}
                  >
                    Late Entry Threshold (Minutes)
                  </label>
                  <input
                    id="inThresholdMinutes"
                    type="number"
                    name="inThresholdMinutes"
                    value={formData.inThresholdMinutes}
                    onChange={handleChange}
                    onBlur={handleNumberBlur}
                    min="0"
                    max="120"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 transition-all duration-200"
                    style={{ backgroundColor: "white" }}
                    disabled={isLoading}
                  />
                  <p
                    className="text-xs mt-1"
                    style={{ color: "#2c2c2c", opacity: 0.6 }}
                  >
                    Minutes after check-in time considered late
                  </p>
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="outThresholdMinutes"
                    className="block text-sm font-medium mb-1"
                    style={{ color: "#2c2c2c" }}
                  >
                    Early Exit Threshold (Minutes)
                  </label>
                  <input
                    id="outThresholdMinutes"
                    type="number"
                    name="outThresholdMinutes"
                    value={formData.outThresholdMinutes}
                    onChange={handleChange}
                    onBlur={handleNumberBlur}
                    min="0"
                    max="480"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 transition-all duration-200"
                    style={{ backgroundColor: "white" }}
                    disabled={isLoading}
                  />
                  <p
                    className="text-xs mt-1"
                    style={{ color: "#2c2c2c", opacity: 0.6 }}
                  >
                    Minutes before check-out time considered early exit
                  </p>
                </div>
              </div>
            </div>

            {/* Leave Settings Section */}
            <div
              className="rounded-xl p-6 shadow-sm border border-gray-200"
              style={{ backgroundColor: "#e4ecaa" }}
            >
              <div className="flex items-center mb-6">
                <div
                  className="p-2 rounded-lg mr-3"
                  style={{ backgroundColor: "#b4ca01" }}
                >
                  <LuCalendar
                    className="w-5 h-5"
                    style={{ color: "#2c2c2c" }}
                  />
                </div>
                <div>
                  <h3
                    className="text-lg font-semibold"
                    style={{ color: "#2c2c2c" }}
                  >
                    Leave Configuration
                  </h3>
                  <p
                    className="text-sm"
                    style={{ color: "#2c2c2c", opacity: 0.7 }}
                  >
                    Configure weekly off days and leave allowances
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label
                    htmlFor="leaveDay"
                    className="block text-sm font-medium mb-1"
                    style={{ color: "#2c2c2c" }}
                  >
                    Weekly Off Day
                  </label>
                  <select
                    id="leaveDay"
                    name="leaveDay"
                    value={formData.leaveDay}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 transition-all duration-200"
                    style={{ backgroundColor: "white" }}
                    disabled={isLoading}
                  >
                    <option value="">Select a day</option>
                    {weekdays.map((day) => (
                      <option key={day.value} value={day.value}>
                        {day.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          className="border-t border-gray-200 px-6 py-4"
          style={{ backgroundColor: "#fafcf0" }}
        >
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={handleClose}
              className="px-6 py-2.5 hover:bg-gray-200 rounded-lg font-medium transition-colors duration-200 disabled:opacity-50"
              style={{
                backgroundColor: "#e4ecaa",
                color: "#2c2c2c",
              }}
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="px-6 py-2.5 hover:opacity-90 text-white rounded-lg font-medium transition-colors duration-200 flex items-center disabled:opacity-50"
              style={{ backgroundColor: "#b4ca01", color: "#2c2c2c" }}
              disabled={isLoading || (isAdminUser && !formData.selectedStoreId)}
            >
              {isLoading ? (
                <>
                  <LuLoader
                    className="w-4 h-4 mr-2 animate-spin"
                    style={{ color: "#2c2c2c" }}
                  />
                  Saving...
                </>
              ) : (
                <>
                  <LuCheck
                    className="w-4 h-4 mr-2"
                    style={{ color: "#2c2c2c" }}
                  />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
