"use client";
import React, { useState } from "react";
import { Calendar, momentLocalizer } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "@/css/calendar/calendar.css";
import CustomToolbar from "./CalendarCustomToolbar";
import ModalLayout from "@/layouts/ModalLayout";
import { FormData } from "@/types/calendar.types";
import {
  useCreateCalendarLeave,
  useDeleteCalendarLeave,
  useGetCalendarLeaves,
} from "@/hooks/RTKHooks";
import CreateHolidayModal from "./CreateHolidayModal";
import CalendarCustomEvent from "./CalendarCustomEvent";
import GridViewCalendarHolidays from "./GridViewCalendarHolidays";

const localizer = momentLocalizer(moment);

const AttendanceCalendar = ({ editable = true }) => {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [formData, setFormData] = useState<FormData>({ title: "", reason: "" });
  const [modalOpen, setModalOpen] = useState(false);
  const [modalOverlayActive, setModalOverlayActive] = useState(false);
  const [viewMode, setViewMode] = useState<"calendar" | "grid">("calendar");

  const { data: calendarData, isPending, refetch } = useGetCalendarLeaves();
  const { mutate: createCalendar } = useCreateCalendarLeave();
  const { mutate: deleteCalendar } = useDeleteCalendarLeave();

  if (isPending) return <h1>Loading...</h1>;

  const handleSelectSlot = (slotInfo: { start: Date }) => {
    setSelectedDate(slotInfo.start);
    openModal();
  };

  const openModal = () => {
    setModalOpen(true);
    setTimeout(() => setModalOverlayActive(true), 10);
  };

  const closeModal = () => {
    setModalOverlayActive(false);
    setTimeout(() => {
      setModalOpen(false);
      setFormData({ title: "", reason: "" });
    }, 300);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSaveEvent = () => {
    if (!formData.title.trim() || !selectedDate) return;

    const formattedDate = moment(selectedDate).format("YYYY-MM-DD");

    createCalendar(
      {
        date: formattedDate,
        reason: formData.reason,
        title: formData.reason,
      },
      {
        onSuccess: () => refetch(),
      }
    );
    closeModal();
  };

  const handleDeleteEvent = (holidayId: string) => {
    deleteCalendar(holidayId, {
      onSuccess: () => refetch(),
    });
  };

  return (
    <>
      {/* View Toggle */}
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-semibold text-[var(--foreground)]">
          Attendance Calendar
        </h1>
        <div className="flex items-center bg-[var(--secondary-background)] rounded-full p-1">
          <button
            onClick={() => setViewMode("calendar")}
            className={`px-4 py-1.5 rounded-full transition ${
              viewMode === "calendar"
                ? "bg-[var(--primary-background)] text-white shadow-md"
                : "text-[var(--foreground)]"
            }`}
          >
            Calendar View
          </button>
          <button
            onClick={() => setViewMode("grid")}
            className={`px-4 py-1.5 rounded-full transition ${
              viewMode === "grid"
                ? "bg-[var(--primary-background)] text-white shadow-md"
                : "text-[var(--foreground)]"
            }`}
          >
            Grid View
          </button>
        </div>
      </div>

      {/* Slide between views */}
      <div className="relative transition-all duration-500 ease-in-out">
        {viewMode === "grid" ? (
          <div className="animate-fade-in">
            <GridViewCalendarHolidays
              calendarData={calendarData}
              handleDeleteEvent={handleDeleteEvent}
            />
          </div>
        ) : (
          <div className="relative h-[61vh] max-h-[500px] overflow-hidden animate-fade-in">
            <Calendar
              localizer={localizer}
              events={calendarData}
              selectable
              startAccessor="start"
              endAccessor="end"
              views={["day", "month", "week"]}
              className="h-full"
              components={{
                toolbar: CustomToolbar,
                event: (props) => (
                  <CalendarCustomEvent
                    customevent={props.event}
                    onDelete={handleDeleteEvent}
                  />
                ),
              }}
              onSelectSlot={handleSelectSlot}
            />
          </div>
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <ModalLayout>
          <CreateHolidayModal
            modalOverlayActive={modalOverlayActive}
            closeModal={closeModal}
            handleSaveEvent={handleSaveEvent}
            handleInputChange={handleInputChange}
            selectedDate={selectedDate}
            formData={formData}
          />
        </ModalLayout>
      )}
    </>
  );
};

export default AttendanceCalendar;
