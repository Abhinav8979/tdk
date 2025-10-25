"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { MdNotifications, MdAccessTime, MdQrCodeScanner } from "react-icons/md";
import { IoIosSend } from "react-icons/io";
import { HiOutlineMenu } from "react-icons/hi";
import { BiMessageDetail } from "react-icons/bi"; // ✅ Query Icon
import { useSession } from "next-auth/react";

import PushMessage from "@/components/modal/PushMessage";
import OvertimeRequestForm from "@/components/modal/OvertimeRequest";
import SeeOvertimeRequest from "@/components/modal/SeeOvertimeRequest";
import ModalLayout from "@/layouts/ModalLayout";
import NotificationMessages from "./NotificationMessage";
import ProfileDropdown from "./TopBarProfile";
import AttendanceCheckInAndOut from "./AttendanceCheckInAndOut";
import { hrAccessProfileNames } from "@/lib/constants";
import QueryModal from "@/components/modal/Query";

interface TopBarProps {
  setCollapse: React.Dispatch<React.SetStateAction<boolean>>;
}

const TopBar: React.FC<TopBarProps> = ({ setCollapse }) => {
  const session = useSession();
  const [dashboardName, setDashboardName] = useState<string>("hr");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isOvertimeModalOpen, setIsOvertimeModalOpen] = useState(false);
  const [isSeeOvertimeModalOpen, setIsSeeOvertimeModalOpen] = useState(false);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [isQueryModalOpen, setIsQueryModalOpen] = useState(false); // ✅ Query state
  const [storeId, setStoreId] = useState<string | null | undefined>(undefined);
  const [name, setName] = useState<string | null | undefined>(undefined);
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  const toggleNotification = () => setIsNotificationOpen((prev) => !prev);

  const openModalViaURL = () => {
    const current = new URLSearchParams(Array.from(searchParams.entries()));
    current.set("push_message", "true");
    router.push(`?${current.toString()}`);
  };

  const handleCloseModal = () => {
    const current = new URLSearchParams(Array.from(searchParams.entries()));
    current.delete("push_message");
    router.push(`?${current.toString()}`);
  };

  const handleCloseOvertimeRequestModal = () => {
    const current = new URLSearchParams(Array.from(searchParams.entries()));
    current.delete("overtimeRequest");
    router.push(`?${current.toString()}`);
  };

  const toggleOvertimeModal = () => setIsOvertimeModalOpen((prev) => !prev);

  useEffect(() => {
    setIsModalOpen(searchParams.get("push_message") === "true");
    setIsSeeOvertimeModalOpen(searchParams.get("overtimeRequest") === "true");
  }, [searchParams]);

  useEffect(() => {
    if (session.status === "authenticated") {
      setDashboardName(
        hrAccessProfileNames.includes(session.data.user.profile as any)
          ? "HR"
          : "Employee"
      );
      setName(session.data.user.username);
      setStoreId(session.data.user.store);
    }
  }, [session.status, session.data]);

  if (session.status !== "authenticated") {
    return null;
  }

  return (
    <header className="bg-white/30 border-b border-white/20 py-3 px-3 md:px-10 shadow-md flex justify-between items-center">
      {/* Left section: Hamburger + Title */}
      <div className="flex items-center gap-3 md:gap-4">
        {/* ✅ Hamburger Icon (only on mobile) */}
        <button
          className="md:hidden p-2 rounded-lg bg-[var(--foreground)] text-white hover:bg-neutral-700"
          onClick={() => setCollapse((prev) => !prev)}
        >
          <HiOutlineMenu size={13} />
        </button>

        <h2 className="text-base text-center hidden sm:block md:text-xl font-semibold text-[#393e46] capitalize">
          {dashboardName} Dashboard
        </h2>
      </div>

      {/* Right section: Icons + Profile */}
      <div className="flex gap-2 sm:gap-3 md:gap-5 items-center justify-center">
        {/* Notification Icon */}
        <div className="relative group inline-block">
          <button
            onClick={toggleNotification}
            className="bg-[var(--foreground)] cursor-pointer hover:bg-neutral-700 p-2 sm:p-3 rounded-full text-white"
          >
            <MdNotifications
              size={11}
              className="sm:w-4 sm:h-4 md:w-5 md:h-5"
            />
          </button>
          <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap bg-black text-white text-xs rounded-md px-2 py-1 opacity-0 group-hover:opacity-100 transition">
            Notifications
          </span>
          {isNotificationOpen && (
            <div className="absolute -left-11 sm:right-0 mt-3 w-52  sm:w-72 md:w-80 bg-white shadow-lg border rounded-md z-50">
              <NotificationMessages />
            </div>
          )}
        </div>

        {/* QR Scanner Icon */}
        <div className="relative group inline-block">
          <button
            onClick={() => setIsQRModalOpen(true)}
            className="bg-[var(--foreground)] cursor-pointer p-2 sm:p-3 rounded-full text-white hover:bg-neutral-700"
          >
            <MdQrCodeScanner
              size={11}
              className="sm:w-4 sm:h-4 md:w-5 md:h-5"
            />
          </button>
          <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap bg-black text-white text-xs rounded-md px-2 py-1 opacity-0 group-hover:opacity-100 transition">
            QR Scanner
          </span>
        </div>

        {/* Push Message - HR only */}
        {dashboardName === "HR" && (
          <div className="relative group inline-block">
            <button
              onClick={openModalViaURL}
              className="bg-[var(--foreground)] cursor-pointer p-2 sm:p-3 rounded-full text-white hover:bg-neutral-700"
            >
              <IoIosSend size={11} className="sm:w-4 sm:h-4 md:w-5 md:h-5" />
            </button>
            <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap bg-black text-white text-xs rounded-md px-2 py-1 opacity-0 group-hover:opacity-100 transition">
              Push Message
            </span>
          </div>
        )}

        {/* Overtime - HR only */}
        {dashboardName === "HR" && (
          <div className="relative group inline-block">
            <button
              onClick={() => {
                const current = new URLSearchParams(
                  Array.from(searchParams.entries())
                );
                current.set("overtimeRequest", "true");
                router.push(`?${current.toString()}`);
              }}
              className="bg-[var(--foreground)] cursor-pointer p-2 sm:p-3 rounded-full text-white hover:bg-neutral-700"
            >
              <MdAccessTime size={11} className="sm:w-4 sm:h-4 md:w-5 md:h-5" />
            </button>
            <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap bg-black text-white text-xs rounded-md px-2 py-1 opacity-0 group-hover:opacity-100 transition">
              Overtime Requests
            </span>
          </div>
        )}

        {/* Overtime - Employee only */}
        {dashboardName !== "HR" && (
          <div className="relative group inline-block">
            <button
              onClick={toggleOvertimeModal}
              className="bg-[var(--foreground)] p-2 sm:p-3 rounded-full cursor-pointer text-white hover:bg-neutral-700"
            >
              <MdAccessTime size={11} className="sm:w-4 sm:h-4 md:w-5 md:h-5" />
            </button>
            <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap bg-black text-white text-xs rounded-md px-2 py-1 opacity-0 group-hover:opacity-100 transition">
              Overtime Request
            </span>
          </div>
        )}

        {/* ✅ Query Icon */}
        <div className="relative group inline-block">
          <button
            onClick={() => setIsQueryModalOpen(true)}
            className="bg-[var(--foreground)] cursor-pointer p-2 sm:p-3 rounded-full text-white hover:bg-neutral-700"
          >
            <BiMessageDetail
              size={11}
              className="sm:w-4 sm:h-4 md:w-5 md:h-5"
            />
          </button>
          <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap bg-black text-white text-xs rounded-md px-2 py-1 opacity-0 group-hover:opacity-100 transition">
            Query
          </span>
        </div>

        {/* Profile Dropdown */}
        <ProfileDropdown role={dashboardName} name={name} />
      </div>

      {/* Modals */}
      {isModalOpen && (
        <ModalLayout>
          <PushMessage
            isOpen={isModalOpen}
            onClose={handleCloseModal}
            currentUserStoreId={storeId || ""}
            isHR={true}
          />
        </ModalLayout>
      )}

      {isSeeOvertimeModalOpen && (
        <ModalLayout>
          <SeeOvertimeRequest onClose={handleCloseOvertimeRequestModal} />
        </ModalLayout>
      )}

      {isOvertimeModalOpen && (
        <ModalLayout>
          <OvertimeRequestForm
            setIsOvertimeModalOpen={setIsOvertimeModalOpen}
          />
        </ModalLayout>
      )}

      {isQRModalOpen && (
        <ModalLayout>
          <AttendanceCheckInAndOut setIsQRModalOpen={setIsQRModalOpen} />
        </ModalLayout>
      )}

      {isQueryModalOpen && (
        <ModalLayout>
          <QueryModal onClose={() => setIsQueryModalOpen(false)} />
        </ModalLayout>
      )}
    </header>
  );
};

export default TopBar;
