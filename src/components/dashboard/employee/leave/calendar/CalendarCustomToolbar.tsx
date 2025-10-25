import React from "react";
import {
  FiChevronLeft,
  FiChevronRight,
  FiCalendar,
  FiList,
  FiGrid,
} from "react-icons/fi";

interface CustomToolbarProps {
  label: string;
  currentDate: Date;
  onNavigate: (action: "prev" | "next" | "today") => void;
  onView: (view: string) => void;
  view: string;
  views: string[];
}

const CustomToolbar = ({
  label,
  currentDate,
  onNavigate,
  onView,
  views,
  view,
}: CustomToolbarProps) => {
  const viewIcons: Record<string, React.ReactNode> = {
    dayGridMonth: <FiCalendar />,
    timeGridWeek: <FiGrid />,
    timeGridDay: <FiList />,
    listMonth: <FiList />,
  };

  return (
    <div className="flex flex-col md:flex-row justify-between items-center gap-3 mb-4 p-4 bg-white/20 backdrop-blur-md rounded-xl text-[var(--foreground)]">
      <div className="flex items-center gap-2">
        <button
          onClick={() => onNavigate("prev")}
          className="hover:bg-[var(--secondary-background)] p-2 rounded-lg transition"
        >
          <FiChevronLeft size={20} />
        </button>
        <h2 className="text-lg font-semibold px-2">{label}</h2>
        <button
          onClick={() => onNavigate("next")}
          className="hover:bg-[var(--secondary-background)] p-2 rounded-lg transition"
        >
          <FiChevronRight size={20} />
        </button>
        <button
          onClick={() => onNavigate("today")}
          className="ml-2 px-3 py-1 text-sm bg-[var(--secondary-background)] hover:bg-opacity-80 rounded-lg transition"
        >
          Today
        </button>
      </div>

      <div className="flex gap-2">
        {views.map((v: string) => (
          <button
            key={v}
            onClick={() => onView(v)}
            className={`flex items-center gap-1 px-3 py-1 rounded-lg transition text-sm ${
              view === v
                ? "bg-[var(--primary-background)] text-[var(--foreground)] font-medium"
                : "hover:bg-[var(--secondary-background)]"
            }`}
          >
            {viewIcons[v] || <FiCalendar />}
            <span>
              {v
                .replace("dayGrid", "Month")
                .replace("timeGrid", "")
                .replace("list", "List")}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default CustomToolbar;
