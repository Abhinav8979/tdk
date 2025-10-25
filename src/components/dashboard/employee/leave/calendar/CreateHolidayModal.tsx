import { formatDate } from "@/utils/helperFunctions";
import React from "react";
import { IoIosClose } from "react-icons/io";

type CalendarModalProps = {
  modalOverlayActive: boolean;
  closeModal: () => void;
  handleSaveEvent: () => void;
  formData: {
    title: string;
    reason: string;
  };
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  selectedDate: Date | null;
  showDelete: string | null;
  handleDeleteEvent: (id: string) => void;
};

const CreateHolidayModal = ({
  modalOverlayActive,
  closeModal,
  // handleSaveEvent,
  formData,
  handleInputChange,
  selectedDate,
  showDelete,
  handleDeleteEvent,
}: CalendarModalProps) => {
  return (
    <div className="flex items-center justify-center p-4 sm:p-6 md:p-8 w-full min-h-screen">
      <div
        className={`w-full max-w-[90%] sm:max-w-md md:max-w-lg lg:max-w-xl transform rounded-lg shadow-xl transition-all duration-300 ${
          modalOverlayActive ? "translate-y-0" : "translate-y-4"
        }`}
        style={{ backgroundColor: "var(--tertiary-background, #fafcf0)" }}
      >
        {/* Modal Header */}
        <div
          className="flex items-center justify-between rounded-t-lg p-3 sm:p-4"
          style={{
            backgroundColor: "var(--primary-background, #b4ca01)",
          }}
        >
          <h3
            className="text-base sm:text-lg font-semibold truncate"
            style={{ color: "var(--foreground, #2c2c2c)" }}
          >
            Add Holiday
          </h3>
          <button
            onClick={closeModal}
            className="rounded-full p-1 transition-colors hover:bg-white hover:bg-opacity-20"
          >
            <IoIosClose size={26} />
          </button>
        </div>

        {/* Selected Date Display */}
        <div
          className="border-b px-4 sm:px-6 py-2 sm:py-3 text-center text-xs sm:text-sm font-medium"
          style={{
            backgroundColor: "var(--secondary-background, #e4ecaa)",
          }}
        >
          {formatDate(selectedDate)}
        </div>

        {/* Form Content */}
        <div className="p-4 sm:p-6">
          {/* Holiday Name */}
          <div className="mb-4">
            <label
              className="mb-1 sm:mb-2 block text-xs sm:text-sm font-medium"
              style={{ color: "var(--foreground, #2c2c2c)" }}
            >
              Holiday Name
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              placeholder="Enter holiday name"
              className="w-full rounded-md border border-gray-300 p-2 text-sm focus:border-transparent focus:outline-none focus:ring-2"
              style={{ backgroundColor: "#fff" }}
            />
          </div>

          {/* Description */}
          <div className="mb-6">
            <label
              className="mb-1 sm:mb-2 block text-xs sm:text-sm font-medium"
              style={{ color: "var(--foreground, #2c2c2c)" }}
            >
              Description (Optional)
            </label>
            <input
              type="text"
              name="reason"
              value={formData.reason}
              onChange={handleInputChange}
              placeholder="Add description"
              className="w-full rounded-md border border-gray-300 p-2 text-sm focus:border-transparent focus:outline-none focus:ring-2"
              style={{ backgroundColor: "#fff" }}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end sm:space-x-3 space-y-2 sm:space-y-0">
            {showDelete && (
              <button
                onClick={() => handleDeleteEvent(showDelete)}
                className="w-full sm:w-auto rounded-md px-4 py-2 text-sm font-medium text-white transition-colors cursor-pointer hover:opacity-90"
                style={{ backgroundColor: "red" }}
              >
                Delete
              </button>
            )}
            <button
              onClick={closeModal}
              className="w-full sm:w-auto rounded-md px-4 py-2 text-sm font-medium transition-colors hover:bg-gray-100 cursor-pointer"
              style={{ color: "var(--foreground, #2c2c2c)" }}
            >
              Cancel
            </button>
            {/* <button
              onClick={handleSaveEvent}
              className="w-full sm:w-auto rounded-md px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90 cursor-pointer"
              style={{ backgroundColor: "var(--primary-background, #b4ca01)" }}
            >
              Save Holiday
            </button> */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateHolidayModal;
