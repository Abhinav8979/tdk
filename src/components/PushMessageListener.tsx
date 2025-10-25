"use client";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import {
  IoNotificationsOutline,
  IoTimeOutline,
  IoCloseOutline,
} from "react-icons/io5";

interface Message {
  id?: string;
  message: string;
  type: string;
  createdAt: string;
}

// Type for custom CSS properties
interface CustomStyles extends React.CSSProperties {
  "--primary-background": string;
  "--foreground": string;
  "--secondary-background": string;
  "--tertiary-background": string;
}

export default function PushMessageListener() {
  const [activeToast, setActiveToast] = useState<Message | null>(null);
  const [showToast, setShowToast] = useState(false);

  // Custom CSS variables matching your design system
  const customStyles: CustomStyles = {
    "--primary-background": "#b4ca01" /* Signature green-yellow */,
    "--foreground": "#2c2c2c" /* Elegant dark grey */,
    "--secondary-background": "#e4ecaa" /* Soft lemon-lime tint */,
    "--tertiary-background": "#fafcf0" /* Very light minimal cream */,
  };

  const closeToast = () => {
    setShowToast(false);
    setTimeout(() => setActiveToast(null), 300); // Wait for transition to end
  };

  useEffect(() => {
    const eventSource = new EventSource("/api/push-message");

    eventSource.onmessage = (event) => {
      try {
        console.log(event);
        const data: Message = JSON.parse(event.data);
        if (data.type !== "heartbeat") {
          console.log(data);
          setActiveToast(data);
          setShowToast(true);

          // Auto-close after 7 seconds
          setTimeout(() => {
            setShowToast(false);
            setTimeout(() => setActiveToast(null), 300);
          }, 7000);
        }
      } catch (err) {
        toast.error("Failed to parse message");
      }
    };

    eventSource.onerror = (err) => {
      toast.error("SSE ERROR");
      eventSource.close();
    };

    return () => eventSource.close();
  }, []);

  return (
    <div style={customStyles}>
      {/* Toast Message */}
      {activeToast && (
        <div
          className={`fixed top-8 right-8 z-50 w-96 max-w-[calc(100vw-4rem)] bg-[var(--tertiary-background)] border border-[var(--secondary-background)] shadow-2xl rounded-xl overflow-hidden transition-all duration-300 transform ${
            showToast
              ? "opacity-100 translate-y-0 scale-100"
              : "opacity-0 -translate-y-4 scale-95"
          }`}
          style={{
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          }}
        >
          {/* Header */}
          <div className="bg-[var(--primary-background)] px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white bg-opacity-20 p-2 rounded-full">
                <IoNotificationsOutline className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-bold text-white text-lg">New Message</h3>
            </div>
            <button
              onClick={closeToast}
              className="text-white hover:bg-white hover:bg-opacity-20 p-1.5 rounded-full transition-all duration-200"
            >
              <IoCloseOutline className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            <div className="text-[var(--foreground)] text-base leading-relaxed mb-4">
              {activeToast.message}
            </div>

            {/* Footer with timestamp */}
            <div className="flex items-center justify-between pt-3 border-t border-[var(--secondary-background)]">
              <div className="flex items-center gap-2 text-sm text-[var(--foreground)] opacity-70">
                <IoTimeOutline className="w-4 h-4" />
                <span className="font-medium">
                  {new Date(activeToast.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-16 h-1 bg-[var(--secondary-background)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[var(--primary-background)] rounded-full animate-pulse"
                  style={{
                    animation: showToast ? "shrink 7s linear" : "none",
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes shrink {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
      `}</style>
    </div>
  );
}
