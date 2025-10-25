"use client";

import { useSendQuery } from "@/hooks/RTKHooks";
import React, { useEffect, useState } from "react";

interface QueryModalProps {
  onClose: () => void;
}

const QueryModal: React.FC<QueryModalProps> = ({ onClose }) => {
  const [subject, setSubject] = useState("");
  const [reason, setReason] = useState("");

  const { mutate: sendQuery, isPending, isSuccess } = useSendQuery();

  const handleSend = () => {
    if (!subject.trim() || !reason.trim()) return;
    sendQuery({ subject, message:reason });
  };

  // ✅ Close modal only when success happens
  useEffect(() => {
    if (isSuccess) {
      onClose();
    }
  }, [isSuccess, onClose]);

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">
        Submit a Query
      </h2>

      {/* Subject */}
      <input
        type="text"
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        placeholder="Enter subject..."
        className="w-full p-3 mb-4 border rounded-md focus:ring-2 focus:ring-[var(--foreground)] focus:outline-none"
      />

      {/* Reason */}
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Enter your reason..."
        className="w-full p-3 border rounded-md focus:ring-2 focus:ring-[var(--foreground)] focus:outline-none resize-none"
        rows={4}
      />

      {/* Buttons */}
      <div className="flex justify-end gap-3 mt-4">
        <button
          onClick={onClose}
          disabled={isPending}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={handleSend}
          disabled={isPending}
          className="px-4 py-2 bg-[var(--foreground)] text-white rounded-lg hover:bg-neutral-700 disabled:opacity-50"
        >
          {isPending ? "Sending..." : "Send"}
        </button>
      </div>
    </div>
  );
};

export default QueryModal;
