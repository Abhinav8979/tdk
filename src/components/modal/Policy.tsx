"use client";
import { useGetPolicy, usePostPolicy, useDeletePolicy } from "@/hooks/RTKHooks";
import React, { useState, useEffect } from "react";
import {
  IoClose,
  IoCloudUploadOutline,
  IoDocumentTextOutline,
  IoTrashOutline,
  IoCheckmarkCircle,
  IoAlertCircle,
  IoDownloadOutline,
} from "react-icons/io5";

interface PolicyFile {
  id: string;
  file: File;
  preview: string;
  status: "pending" | "uploading" | "success" | "error";
}

interface ExistingPolicy {
  id: string;
  url: string;
  fileName: string;
  updatedAt: string;
}

interface PolicyUploadModalProps {
  id: string | undefined;
  onClose: () => void;
  isUploadAllowed?: boolean;
}

const PolicyUploadModal: React.FC<PolicyUploadModalProps> = ({
  id,
  onClose,
  isUploadAllowed = true,
}) => {
  const [files, setFiles] = useState<PolicyFile[]>([]);
  const [dragActive, setDragActive] = useState(false);

  // ✅ Get policy list
  const { data: policies, isPending, refetch } = useGetPolicy(id || "");

  // ✅ Upload hook (mutation)
  const { mutateAsync: uploadPolicy, isPending: isUploading } = usePostPolicy(
    id || ""
  );

  // ✅ Delete hook (mutation)
  const { mutateAsync: deletePolicy } = useDeletePolicy(id || "");

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === "dragenter" || e.type === "dragover");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    handleFiles(droppedFiles);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(Array.from(e.target.files));
    }
  };

  const handleFiles = (fileList: File[]) => {
    const pdfFiles = fileList.filter((file) => file.type === "application/pdf");

    const newFiles: PolicyFile[] = pdfFiles.map((file) => ({
      id: `${Date.now()}-${Math.random()}`,
      file,
      preview: file.name,
      status: "pending",
    }));

    setFiles((prev) => [...prev, ...newFiles]);
  };

  const handleDelete = (id: string) => {
    setFiles((prev) => prev.filter((file) => file.id !== id));
  };

  const handleDeleteExisting = async (policyId: string) => {
    if (!confirm("Are you sure you want to delete this policy?")) return;

    try {
      await deletePolicy(policyId);
      refetch();
    } catch (error) {
      console.error("Delete failed:", error);
      alert("Failed to delete policy");
    }
  };

  const handleDownload = (url: string, fileName: string) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleUpload = async () => {
    for (const file of files) {
      try {
        // Set uploading status
        setFiles((prev) =>
          prev.map((f) =>
            f.id === file.id ? { ...f, status: "uploading" } : f
          )
        );

        const formData = new FormData();
        formData.append("file", file.file);

        // ✅ Upload using React Query mutation
        await uploadPolicy(formData);

        // Mark success
        setFiles((prev) =>
          prev.map((f) => (f.id === file.id ? { ...f, status: "success" } : f))
        );
      } catch (error) {
        console.error("Upload failed:", error);
        setFiles((prev) =>
          prev.map((f) => (f.id === file.id ? { ...f, status: "error" } : f))
        );
      }
    }

    // Refetch policies after all uploads complete
    setTimeout(() => {
      refetch();
      setFiles([]);
    }, 1000);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        onClick={onClose}
      >
        <div
          className="relative w-full max-w-3xl max-h-[90vh] overflow-hidden bg-white rounded-lg shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <h2 className="text-2xl font-semibold text-gray-800">
              Policy Documents
            </h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 transition-colors rounded-md hover:bg-gray-100"
            >
              <IoClose size={24} />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
            {/* Existing Policies Section */}
            {isPending ? (
              <div className="py-8 text-center text-gray-500">
                Loading existing policies...
              </div>
            ) : policies && policies.policies.length > 0 ? (
              <div className="mb-6">
                <h3 className="mb-4 text-lg font-semibold text-gray-700">
                  Existing Policies ({policies.policies.length})
                </h3>
                <div className="space-y-3">
                  {policies.policies.map((policy: ExistingPolicy) => (
                    <div
                      key={policy.id}
                      className="flex items-center justify-between p-4 transition-colors border rounded-lg bg-gray-50 hover:bg-gray-100"
                    >
                      <div className="flex items-center flex-1 gap-3 min-w-0">
                        <IoDocumentTextOutline
                          size={24}
                          className="text-[#b4ca01] flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">
                            {policy.fileName}
                          </p>
                          <p className="text-sm text-gray-500">
                            Uploaded: {formatDate(policy.updatedAt)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            handleDownload(policy.url, policy.fileName)
                          }
                          className="p-2 text-[#b4ca01] rounded-md transition-colors hover:bg-[#e4ecaa] flex-shrink-0"
                          title="Download policy"
                        >
                          <IoDownloadOutline size={20} />
                        </button>
                        {isUploadAllowed && (
                          <button
                            onClick={() => handleDeleteExisting(policy.id)}
                            className="p-2 text-red-500 rounded-md transition-colors hover:bg-red-50 flex-shrink-0"
                            title="Delete policy"
                          >
                            <IoTrashOutline size={20} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Upload Area - Only show if upload is allowed */}
            {isUploadAllowed && (
              <>
                <div className="mb-6">
                  <h3 className="mb-4 text-lg font-semibold text-gray-700">
                    Upload New Policy
                  </h3>
                  <div
                    className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                      dragActive
                        ? "border-[#b4ca01] bg-[#f5f8e8]"
                        : "border-gray-300 hover:border-[#b4ca01]"
                    }`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                  >
                    <IoCloudUploadOutline
                      size={48}
                      className="mx-auto mb-4 text-gray-400"
                    />
                    <p className="mb-2 text-lg font-medium text-gray-700">
                      Drag & drop PDF files here
                    </p>
                    <p className="mb-4 text-sm text-gray-500">or</p>
                    <label className="inline-block px-6 py-2 text-white bg-[#b4ca01] rounded-md cursor-pointer hover:bg-[#a3b801] transition-colors">
                      Browse Files
                      <input
                        type="file"
                        multiple
                        accept=".pdf"
                        onChange={handleFileInput}
                        className="hidden"
                      />
                    </label>
                    <p className="mt-4 text-xs text-gray-500">
                      Supports: PDF files only
                    </p>
                  </div>
                </div>

                {/* New Files to Upload List */}
                {files.length > 0 && (
                  <div>
                    <h3 className="mb-4 text-lg font-semibold text-gray-700">
                      Files to Upload ({files.length})
                    </h3>
                    <div className="space-y-3">
                      {files.map((file) => (
                        <div
                          key={file.id}
                          className="flex items-center justify-between p-4 border rounded-lg bg-blue-50"
                        >
                          <div className="flex items-center flex-1 gap-3 min-w-0">
                            <IoDocumentTextOutline
                              size={24}
                              className="text-blue-500 flex-shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 truncate">
                                {file.file.name}
                              </p>
                              <p className="text-sm text-gray-500">
                                {formatFileSize(file.file.size)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {file.status === "pending" && (
                              <span className="text-sm text-gray-600">
                                Pending
                              </span>
                            )}
                            {file.status === "uploading" && (
                              <span className="text-sm text-blue-600">
                                Uploading...
                              </span>
                            )}
                            {file.status === "success" && (
                              <IoCheckmarkCircle
                                size={24}
                                className="text-green-500"
                              />
                            )}
                            {file.status === "error" && (
                              <IoAlertCircle
                                size={24}
                                className="text-red-500"
                              />
                            )}
                            <button
                              onClick={() => handleDelete(file.id)}
                              className="p-2 text-red-500 rounded-md transition-colors hover:bg-red-50 flex-shrink-0"
                              title="Remove from queue"
                            >
                              <IoTrashOutline size={20} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
            <button
              onClick={onClose}
              className="px-6 py-2 text-gray-700 transition-colors bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Close
            </button>
            {isUploadAllowed && files.length > 0 && (
              <button
                onClick={handleUpload}
                disabled={isUploading}
                className="px-6 py-2 bg-[#b4ca01] text-white rounded-md hover:bg-[#a3b801] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploading ? "Uploading..." : `Upload (${files.length})`}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default PolicyUploadModal;
