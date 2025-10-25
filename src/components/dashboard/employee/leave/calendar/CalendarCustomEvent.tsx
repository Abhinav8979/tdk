import React from "react";
import { IoTrashOutline } from "react-icons/io5";

interface EventWithDeleteProps {
  customevent: {
    title: string;
    id: string;
  };
  onDelete: (holidayId: string) => void;
}

const CalendarCustomEvent: React.FC<EventWithDeleteProps> = ({
  customevent,
  onDelete,
}) => {
  return (
    <div className="flex justify-between items-center  gap-1">
      <span>{customevent.title}</span>
      <IoTrashOutline
        className="text-red-500 hover:text-red-700 cursor-pointer"
        size={12}
        onClick={(e) => {
          e.stopPropagation();
          onDelete(customevent.id);
        }}
      />
    </div>
  );
};

export default CalendarCustomEvent;
