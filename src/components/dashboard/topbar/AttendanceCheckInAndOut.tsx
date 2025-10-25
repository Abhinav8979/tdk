"use client";

import { Dispatch, SetStateAction, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { useSession } from "next-auth/react";

export default function QRGenerator({
  setIsQRModalOpen,
}: {
  setIsQRModalOpen: Dispatch<SetStateAction<boolean>>;
}) {
  const { data: session } = useSession();
  const [mode, setMode] = useState<"in" | "out">("in");

  // ✅ build QR data object
  const qrData = session?.user
    ? JSON.stringify({
        userId: session.user.userId as any, // adjust key if different
        action: mode,
      })
    : "";

  if (!qrData) return <p>Loading...</p>;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
      <div className="relative bg-[var(--tertiary-background)] rounded-2xl p-8 shadow-2xl flex flex-col items-center">
        {/* Close Button */}
        <button
          onClick={() => setIsQRModalOpen(false)}
          className="absolute top-3 right-3 text-[var(--foreground)] text-2xl font-bold hover:text-red-500"
        >
          ✕
        </button>

        {/* Heading */}
        <h2 className="text-2xl font-semibold mb-6 text-[var(--foreground)]">
          {mode === "in" ? "In Time QR" : "Out Time QR"}
        </h2>

        {/* QR Code */}
        <div className="p-4 bg-[var(--secondary-background)] rounded-2xl shadow-lg">
          <QRCodeCanvas value={qrData} size={220} />
        </div>

        {/* Buttons */}
        <div className="flex gap-4 mt-8">
          <button
            onClick={() => setMode("in")}
            className={`px-5 py-2 rounded-xl font-medium shadow-md transition ${
              mode === "in"
                ? "bg-[var(--primary-background)] text-white"
                : "bg-[var(--secondary-background)] text-[var(--foreground)]"
            }`}
          >
            In Time
          </button>

          <button
            onClick={() => setMode("out")}
            className={`px-5 py-2 rounded-xl font-medium shadow-md transition ${
              mode === "out"
                ? "bg-[var(--primary-background)] text-white"
                : "bg-[var(--secondary-background)] text-[var(--foreground)]"
            }`}
          >
            Out Time
          </button>
        </div>
      </div>
    </div>
  );
}
