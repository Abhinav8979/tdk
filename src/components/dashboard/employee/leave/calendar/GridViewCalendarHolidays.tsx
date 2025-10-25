import React from "react";
import moment from "moment";

const GridViewCalendarHolidays = ({ calendarData, handleDeleteEvent }) => {
  const formattedEvents =
    calendarData?.map((event) => ({
      ...event,
      start: new Date(event.start),
      end: new Date(event.end),
    })) || [];

  return (
    <div className="mt-8 px-6 py-8 bg-[var(--tertiary-background)] border border-[var(--secondary-background)] rounded-2xl shadow-sm">
      <h2 className="text-2xl font-semibold text-[var(--foreground)] mb-6 border-b pb-3">
        Organization Holiday Calendar 📅
      </h2>

      <div className="divide-y divide-[var(--secondary-background)]">
        {[...formattedEvents]
          .sort(
            (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
          )
          .map((event) => (
            <div
              key={event.id}
              className="flex items-center justify-between py-4"
            >
              <div>
                <p className="text-lg font-medium text-[var(--foreground)]">
                  {moment(event.start).format("MMMM D, YYYY")}
                </p>
                <p className="text-sm text-gray-600">{event.reason}</p>
              </div>
              <button
                onClick={() => handleDeleteEvent(event.id)}
                className="text-sm text-red-600 hover:text-white border border-red-500 hover:bg-red-600 px-4 py-1.5 rounded-lg transition font-medium"
              >
                Delete
              </button>
            </div>
          ))}
      </div>

      {formattedEvents.length === 0 && (
        <p className="text-gray-500 text-center py-10 italic">
          No holidays added yet.
        </p>
      )}
    </div>
  );
};

export default GridViewCalendarHolidays;
