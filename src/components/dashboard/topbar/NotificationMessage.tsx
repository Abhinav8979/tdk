"use client";
import { useGetNotificationHistory } from "@/hooks/RTKHooks";
import { useRef, useCallback, JSX } from "react";
import {
  IoBarbellOutline,
  IoTimeOutline,
  IoPersonOutline,
  IoWarningOutline,
  IoInformationCircleOutline,
  IoCheckmarkCircleOutline,
  IoCloseCircleOutline,
} from "react-icons/io5";

// Enum for notification types for better type safety
enum NotificationType {
  INFO = "INFO",
  WARNING = "WARNING",
  SUCCESS = "SUCCESS",
  ERROR = "ERROR",
}

interface NotificationMessage {
  id: string;
  type: NotificationType;
  message: string;
  expiryTime: string;
  createdAt: string;
  read: boolean;
  recipientType: string;
  storeName: string | null;
  createdBy: string;
}

interface NotificationMessagesProps {
  className?: string;
}

// Type for custom CSS properties
interface CustomStyles extends React.CSSProperties {
  "--primary-background": string;
  "--foreground": string;
  "--secondary-background": string;
  "--tertiary-background": string;
  "--accent-color": string;
}

const NotificationMessages: React.FC<NotificationMessagesProps> = () => {
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: notifications = [], isPending } = useGetNotificationHistory();

  // Enhanced custom CSS variables with better color scheme
  const customStyles: CustomStyles = {
    "--primary-background": "#b4ca01" /* Signature green-yellow */,
    "--foreground": "#2c2c2c" /* Elegant dark grey */,
    "--secondary-background": "#e4ecaa" /* Soft lemon-lime tint */,
    "--tertiary-background": "#fafcf0" /* Very light minimal cream */,
    "--accent-color": "#b4ca01",
  };

  // Get notification type icon with proper typing
  const getNotificationIcon = useCallback(
    (type: NotificationType): JSX.Element => {
      switch (type) {
        case NotificationType.WARNING:
          return <IoWarningOutline className="w-5 h-5 text-orange-500" />;
        case NotificationType.SUCCESS:
          return (
            <IoCheckmarkCircleOutline className="w-5 h-5 text-green-600" />
          );
        case NotificationType.ERROR:
          return <IoCloseCircleOutline className="w-5 h-5 text-red-500" />;
        case NotificationType.INFO:
        default:
          return (
            <IoInformationCircleOutline className="w-5 h-5 text-[var(--primary-background)]" />
          );
      }
    },
    []
  );

  // Format relative time with proper typing
  const formatRelativeTime = useCallback((dateString: string): string => {
    const date: Date = new Date(dateString);
    const now: Date = new Date();
    const diffMs: number = now.getTime() - date.getTime();
    const diffMins: number = Math.floor(diffMs / (1000 * 60));
    const diffHours: number = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays: number = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }, []);

  // Loading state with proper typing
  if (isPending) {
    return (
      <div className="flex items-center justify-center p-6">
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[var(--primary-background)]"></div>
          <span className="text-[var(--foreground)] font-medium">
            Loading notifications...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative`} ref={dropdownRef} style={customStyles}>
      {/* Dropdown */}
      <>
        {/* Header */}
        <div
          className="sm:px-6 sm:py-5 p-2 border-b bg-[var(--primary-background)]"
          style={{
            borderColor: "rgba(255, 255, 255, 0.1)",
          }}
        >
          <div className="flex items-center justify-between">
            <h3 className="sm:text-xl  font-bold text-white">Notifications</h3>
            <div className="bg-white bg-opacity-20 sm:px-3 p-1 rounded-full">
              <span className="text-black text-sm font-medium">
                {notifications.length} total
              </span>
            </div>
          </div>
        </div>

        {/* Notifications List */}
        <div className="max-h-[28rem] sm:max-h-[32rem] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-12 text-center">
              <div className="bg-[var(--secondary-background)] rounded-full p-6 w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                <IoBarbellOutline className="w-8 h-8 text-[var(--foreground)]" />
              </div>
              <h4 className="text-lg font-semibold text-[var(--foreground)] mb-2">
                No notifications yet
              </h4>
              <p className="text-[var(--foreground)] opacity-60">
                You'll see new messages here when they arrive
              </p>
            </div>
          ) : (
            notifications.map(
              (notification: NotificationMessage, index: number) => (
                <div
                  key={notification.id}
                  className={`sm:p-6 p-2 transition-all hover:bg-[var(--secondary-background)] ${
                    index !== notifications.length - 1
                      ? "border-b border-[var(--secondary-background)]"
                      : ""
                  }`}
                >
                  <div className="flex  items-start gap-3 sm:gap-4">
                    {/* Icon */}
                    <div className="flex-shrink-0 mt-1">
                      <div className="p-2 rounded-full bg-[var(--secondary-background)]">
                        {getNotificationIcon(notification.type)}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="sm:text-base text-sm leading-relaxed mb-3 break-words text-[var(--foreground)]">
                        {notification.message}
                      </p>

                      {/* Meta Info - Date and Name in same line */}
                      <div className="flex items-center justify-between sm:text-sm text-xs text-[var(--foreground)] opacity-70">
                        <div className="flex items-center gap-2">
                          <IoTimeOutline className="w-4 h-4" />
                          <span className="font-medium">
                            {formatRelativeTime(notification.createdAt)}
                          </span>
                        </div>

                        {notification.createdBy && (
                          <div className="flex items-center gap-2">
                            <IoPersonOutline className="w-4 h-4" />
                            <span className="font-medium">
                              {notification.createdBy}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            )
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div
            className="px-6 py-4 border-t bg-gray-50"
            style={{
              borderColor: "#e5e7eb",
            }}
          >
            <div className="text-center">
              <span className="text-sm text-gray-500">
                {notifications.length}{" "}
                {notifications.length === 1 ? "notification" : "notifications"}{" "}
                total
              </span>
            </div>
          </div>
        )}
      </>
    </div>
  );
};

export default NotificationMessages;
