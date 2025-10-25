"use client";

import { useEffect, useRef, useState } from "react";
import { Html5QrcodeScanner, Html5QrcodeResult } from "html5-qrcode";

export default function QrScanner() {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      "reader",
      { fps: 10, qrbox: { width: 250, height: 250 } },
      false // verbose = false
    );

    scanner.render(
      async (decodedText: string, decodedResult: Html5QrcodeResult) => {
        console.log("QR Code decoded:", decodedText);

        try {
          // Example: decodedText contains action info (in/out)
          const qrData = JSON.parse(decodedText); // assuming QR contains JSON
          const res = await fetch(`/api/attendance?action=${qrData.action}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              // action: qrData.action,
              date: new Date().toISOString().split("T")[0], // current date in YYYY-MM-DD
              userId: qrData.userId,
            }),
          });

          if (res.ok) {
            if (qrData.action === "in") {
              setMessage("✅ Your In Time is marked");
            } else if (qrData.action === "out") {
              setMessage("✅ Your Out Time is marked");
            } else {
              setMessage("⚠️ Attendance marked");
            }

            // Stop the camera after marking attendance
            scanner.clear().then(() => {
              console.log("Camera stopped");
            });
          } else {
            setMessage("❌ Failed to mark attendance");
          }
        } catch (error) {
          console.error("Error while marking attendance:", error);
          setMessage("❌ Something went wrong");
        }
      },
      (errorMessage: string) => {
        // Ignore scan errors
      }
    );

    scannerRef.current = scanner;

    return () => {
      scanner
        .clear()
        .catch((err) => console.error("Failed to clear scanner", err));
    };
  }, []);

  return (
    <div className="flex flex-col items-center">
      <h1 className="text-xl font-bold mb-4">Scan Your QR Code</h1>
      <div id="reader" style={{ width: "400px" }}></div>
      {message && (
        <div className="mt-4 p-2 bg-green-200 rounded text-center">
          {message}
        </div>
      )}
    </div>
  );
}
