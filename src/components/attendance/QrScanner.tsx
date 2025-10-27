"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import type { QrReaderProps } from "react-qr-reader";

const QrReader = dynamic<QrReaderProps>(
  () => import("react-qr-reader").then((mod) => mod.QrReader),
  { ssr: false }
);

export default function QRScanner() {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  return (
    <div className="p-4">
      {!scanning && (
        <button
          onClick={() => setScanning(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          Scan QR Code
        </button>
      )}

      {scanning && (
        <div className="mt-4 w-full max-w-sm">
          {/* ✅ style container, not the component */}
          <div className="w-full">
            <QrReader
              constraints={{ facingMode: "environment" }}
              onResult={(result, error) => {
                if (result) {
                  setResult(result.getText());
                  setScanning(false);
                }
                if (error) {
                  console.warn(error);
                }
              }}
            />
          </div>

          <button
            onClick={() => setScanning(false)}
            className="mt-2 px-4 py-2 bg-red-500 text-white rounded"
          >
            Stop Scanning
          </button>
        </div>
      )}

      {result && (
        <div className="mt-4 p-2 border rounded bg-gray-100">
          <p className="font-bold">Scanned Result:</p>
          <p>{result}</p>
        </div>
      )}
    </div>
  );
}
