"use client";

import React, { useState, useMemo } from "react";
import FullCalendar from "@fullcalendar/react";
import { EventInput } from "@fullcalendar/core";
import { EventClickArg } from "@fullcalendar/core";
import { DateClickArg } from "@fullcalendar/interaction";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import ModalLayout from "@/layouts/ModalLayout";
import CreateHolidayModal from "@/components/dashboard/employee/leave/calendar/CreateHolidayModal";
import { FormData } from "@/types/calendar.types";
import {
  useCreateCalendarLeave,
  useDeleteCalendarLeave,
  useGetCalendarLeaves,
} from "@/hooks/RTKHooks";
import moment from "moment";
import { toast } from "react-toastify";

import "./calendar.css";
import CalendarSkeleton from "../skeletonLoading/CalendarSkeletonLoading";
const CustomToolbarCalendar = ({
  isEditable = false,
  storeName = null,
}: {
  isEditable: boolean;
  storeName: string | null;
}) => {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [formData, setFormData] = useState<FormData>({ title: "", reason: "" });
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [modalOverlayActive, setModalOverlayActive] = useState<boolean>(false);
  const [showDelete, setShowDelete] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");

  const {
    data: calendarData = [],
    isPending,
    refetch,
  } = useGetCalendarLeaves(storeName);
  const { mutate: createCalendar } = useCreateCalendarLeave();
  const { mutate: deleteCalendar } = useDeleteCalendarLeave();

  // Sort holidays in ascending order for list view
  const sortedHolidays = useMemo(() => {
    return [...calendarData].sort((a, b) => {
      const dateA = moment(a.date || a.start);
      const dateB = moment(b.date || b.start);
      return dateA.isBefore(dateB) ? -1 : 1;
    });
  }, [calendarData]);

  if (isPending) return <CalendarSkeleton />;

  const openModal = () => {
    setModalOpen(true);
    setTimeout(() => setModalOverlayActive(true), 10);
  };

  const closeModal = () => {
    setModalOverlayActive(false);
    setTimeout(() => {
      setModalOpen(false);
      setFormData({ title: "", reason: "" });
      setShowDelete(null);
      setSelectedDate(null);
    }, 300);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSaveEvent = () => {
    if (!formData.title.trim() || !selectedDate) {
      if (!selectedDate) {
        toast.error("Please select a date for the holiday");
      }
      return;
    }

    const formattedDate = moment(selectedDate).format("YYYY-MM-DD");

    console.log(formData);

    createCalendar(
      {
        date: formattedDate,
        reason: formData.title,
        title: formData.title,
        storeName: storeName || " ",
        editing: formData.editing || false,
      },
      {
        onSuccess: () => {
          toast.success("Holiday Added Successfully!");
          refetch();
        },
      }
    );
    closeModal();
  };

  const handleDeleteEvent = (holidayId: string) => {
    deleteCalendar(holidayId, {
      onSuccess: () => {
        toast.success("Holiday Deleted Successfully!");
        refetch();
        closeModal();
      },
    });
  };

  const handleEventClick = (info: EventClickArg) => {
    if (!isEditable) return;

    const event = info.event;

    setFormData({ title: event.title, reason: formData.title, editing: true });

    setShowDelete(event.id);
    setSelectedDate(event.start ?? null);
    openModal();
  };

  const handleDateClick = (info: DateClickArg) => {
    if (!isEditable) return;
    setSelectedDate(info.date);
    setShowDelete(null);
    openModal();
  };

  const handleListItemClick = (holiday: any) => {
    if (!isEditable) return;
    setShowDelete(holiday.id);
    setSelectedDate(new Date(holiday.date || holiday.start));
    openModal();
  };

  const handleAddHoliday = () => {
    if (!isEditable) return;
    setSelectedDate(null); // Don't pre-select a date, let user choose
    setShowDelete(null);
    openModal();
  };

  return (
    <>
      <div className="mb-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 px-2 sm:px-0">
        <div className="flex gap-5 w-full sm:w-auto">
          <button
            onClick={() => setViewMode("calendar")}
            className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-l-lg sm:rounded-lg font-medium text-sm sm:text-base transition-colors ${
              viewMode === "calendar"
                ? "bg-[var(--primary-background)] text-[var(--foreground)]"
                : "bg-[var(--secondary-background)] text-[var(--foreground)] hover:bg-[var(--tertiary-background)]"
            }`}
          >
            <span className="hidden sm:inline">Calendar View</span>
            <span className="sm:hidden">Calendar</span>
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-r-lg sm:rounded-lg font-medium text-sm sm:text-base transition-colors ${
              viewMode === "list"
                ? "bg-[var(--primary-background)] text-[var(--foreground)]"
                : "bg-[var(--secondary-background)] text-[var(--foreground)] hover:bg-[var(--tertiary-background)]"
            }`}
          >
            <span className="hidden sm:inline">List View</span>
            <span className="sm:hidden">List</span>
          </button>
        </div>
      </div>

      {viewMode === "calendar" ? (
        <FullCalendar
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          events={calendarData as EventInput[]}
          dateClick={handleDateClick}
          eventClick={handleEventClick}
          height="auto"
          aspectRatio={window.innerWidth < 768 ? 0.8 : 1.35}
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "",
          }}
          titleFormat={{
            year: "numeric",
            month: window.innerWidth < 640 ? "short" : "long",
          }}
          dayHeaderFormat={{
            weekday: window.innerWidth < 640 ? "narrow" : "short",
          }}
          eventDisplay="block"
          dayMaxEvents={window.innerWidth < 640 ? 2 : 3}
          moreLinkClick="popover"
        />
      ) : (
        <div className="bg-white rounded-lg shadow-sm ">
          <div className="p-4 border-b bg-[var(--tertiary-background)]">
            <h3 className="text-lg font-semibold text-[var(--foreground)]">
              Holidays List ({sortedHolidays.length})
            </h3>
          </div>
          <div className="divide-y divide-gray-200">
            {sortedHolidays.length === 0 ? (
              <div className="p-8 text-center text-[var(--foreground)]">
                <p>No holidays found</p>
                {isEditable && (
                  <button
                    onClick={handleAddHoliday}
                    className="mt-2 px-4 py-2 bg-[var(--primary-background)] text-[var(--foreground)] rounded-lg hover:bg-[var(--secondary-background)] transition-colors"
                  >
                    Add First Holiday
                  </button>
                )}
              </div>
            ) : (
              sortedHolidays.map((holiday, index) => {
                const holidayDate = moment(holiday.date || holiday.start);
                return (
                  <div
                    key={holiday.id || index}
                    className={`p-4 flex items-center justify-between hover:bg-[var(--tertiary-background)] transition-colors ${
                      isEditable ? "cursor-pointer" : ""
                    }`}
                    onClick={() => isEditable && handleListItemClick(holiday)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-[var(--secondary-background)] rounded-lg flex items-center justify-center">
                          <span className="text-[var(--foreground)] font-semibold text-sm">
                            {holidayDate.format("MMM")}
                          </span>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-medium text-[var(--foreground)]">
                          {holiday.title || holiday.reason}
                        </h4>
                        <p className="text-sm text-gray-500">
                          {holidayDate.format("MMMM DD, YYYY")} •{" "}
                          {holidayDate.format("dddd")}
                        </p>
                        {holiday.reason && holiday.reason !== holiday.title && (
                          <p className="text-xs text-gray-400 mt-1">
                            {holiday.reason}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">
                        {holidayDate.fromNow()}
                      </span>
                      {isEditable && (
                        <svg
                          className="w-4 h-4 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {modalOpen && (
        <ModalLayout>
          <CreateHolidayModal
            modalOverlayActive={modalOverlayActive}
            closeModal={closeModal}
            handleSaveEvent={handleSaveEvent}
            handleInputChange={handleInputChange}
            selectedDate={selectedDate}
            formData={formData}
            showDelete={showDelete}
            handleDeleteEvent={handleDeleteEvent}
          />
        </ModalLayout>
      )}
    </>
  );
};

export default CustomToolbarCalendar;
