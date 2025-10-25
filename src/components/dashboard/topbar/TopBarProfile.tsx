"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FiUser, FiLogOut } from "react-icons/fi";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { rootEmployeeRoute, rootHrRoute } from "@/lib/paths";

const DropdownPortal = ({ children }: { children: React.ReactNode }) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted ? createPortal(children, document.body) : null;
};

export default function ProfileDropdown({
  name,
  role,
}: {
  name: string | null | undefined;
  role: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        ref.current &&
        !ref.current.contains(e.target as Node) &&
        !buttonRef.current?.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setCoords({ top: rect.bottom + 10, left: rect.left - 100 });
    }
  }, [isOpen]);

  return (
    <>
      <div
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="md:w-10 md:h-10 w-6 h-6 bg-[var(--foreground)]  capitalize md:text-base text-xs text-white flex items-center justify-center rounded-full cursor-pointer font-bold"
      >
        {name?.at(0)}
      </div>

      {isOpen && (
        <DropdownPortal>
          <div
            ref={ref}
            style={{ position: "absolute", top: coords.top, left: coords.left }}
            className="w-40 bg-white/30 backdrop-blur-md border border-[var(--secondary-background)] shadow-xl rounded-xl z-[9999]"
          >
            <Link
              href={
                role === "Hr" ? rootHrRoute : rootEmployeeRoute + "/profile"
              }
              className="flex items-center gap-4 px-4 py-3 text-[var(--foreground)] hover:bg-[var(--secondary-background)] transition-all duration-200 rounded-lg"
            >
              <FiUser className="text-xl" />
              <span className="text-sm">Profile</span>
            </Link>
            <button
              onClick={() =>
                signOut({
                  callbackUrl: "/login",
                })
              }
              className="w-full flex items-center gap-4 px-4 py-3 text-[var(--foreground)] hover:bg-[var(--secondary-background)] transition-all duration-200 rounded-lg"
            >
              <FiLogOut className="text-xl" />
              <span className="text-sm">Logout</span>
            </button>
          </div>
        </DropdownPortal>
      )}
    </>
  );
}
