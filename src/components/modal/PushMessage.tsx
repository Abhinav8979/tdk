"use client";

import { useEmployeeDetals, usePushMessage } from "@/hooks/RTKHooks";
import React, { useState, useRef, useEffect } from "react";
import { toast } from "react-toastify";

interface Recipient {
  id: string;
  name: string;
  storeId?: string;
}

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserStoreId?: string;
  isHR?: boolean;
}

const PushMessage: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  currentUserStoreId,
  isHR = false,
}) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([
    "all",
  ]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [filteredRecipients, setFilteredRecipients] = useState<Recipient[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [employees, setEmployees] = useState<Recipient[]>([]);

  const { data: employessData, isPending } = useEmployeeDetals();
  const { mutate: pushMessage } = usePushMessage();

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredRecipients(employees);
    } else {
      const filtered = employees.filter((recipient) =>
        recipient.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredRecipients(filtered);
    }
  }, [searchQuery, employees]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const messageType = "INFO";
  const expiryTime = new Date(Date.now() + 3600 * 1000).toISOString();

  const handleSend = () => {
    if (!description.trim()) {
      alert("Message is required");
      return;
    }

    const isIndividual = !selectedRecipients.includes("all");

    if (isHR) {
      if (!currentUserStoreId) {
        alert("Store information not available. Please contact administrator.");
        return;
      }

      if (isIndividual) {
        const invalidEmployees = employees.filter(
          (emp) =>
            selectedRecipients.includes(emp.id) &&
            emp.storeId !== currentUserStoreId
        );

        if (invalidEmployees.length > 0) {
          alert("You can only send messages to employees in your store.");
          return;
        }
      }
    }

    const sendMessages = async () => {
      try {
        if (isIndividual) {
          for (const userId of selectedRecipients) {
            const payload: any = {
              message: description,
              type: messageType,
              expiryTime,
              recipientType: "INDIVIDUAL",
              userId,
            };

            await new Promise<void>((resolve, reject) => {
              pushMessage(payload, {
                onSuccess: () => resolve(),
                onError: (error: any) => reject(error),
              });
            });
          }
        } else {
          const payload: any = {
            message: description,
            type: messageType,
            expiryTime,
            recipientType: "STORE",
            storeName: currentUserStoreId,
          };

          await new Promise<void>((resolve, reject) => {
            pushMessage(payload, {
              onSuccess: () => resolve(),
              onError: (error: any) => reject(error),
            });
          });
        }

        setTitle("");
        setDescription("");
        setSelectedRecipients(["all"]);
        setSearchQuery("");
        onClose();
      } catch (error: any) {
        const errorMessage =
          error?.response?.data?.error || "Failed to send message";
        toast.error(errorMessage);
      }
    };

    sendMessages();
  };

  const toggleRecipient = (recipientId: string) => {
    if (recipientId === "all") {
      setSelectedRecipients(["all"]);
    } else {
      if (selectedRecipients.includes("all")) {
        setSelectedRecipients([recipientId]);
      } else {
        setSelectedRecipients((prev) =>
          prev.includes(recipientId)
            ? prev.filter((id) => id !== recipientId)
            : [...prev, recipientId]
        );
      }
    }
  };

  const getSelectedRecipientNames = () => {
    if (selectedRecipients.includes("all")) {
      return isHR ? "All Store Employees" : "All Employees";
    }
    const selectedNames = employees
      .filter((r) => selectedRecipients.includes(r.id))
      .map((r) => r.name);
    return selectedNames.length > 0
      ? selectedNames.join(", ")
      : "Select Recipients";
  };

  useEffect(() => {
    if (employessData) {
      const normalized = Array.isArray(employessData)
        ? employessData
        : [employessData];

      const mapped: Recipient[] = normalized.map((emp) => ({
        id: emp.id,
        name: emp.username,
        storeId: emp.store || "",
      }));

      setEmployees(mapped);
    }
  }, [employessData]);

  if (isPending) return null;

  return (
    <div className="bg-[#fafcf0] rounded-lg p-6 w-full max-w-md">
      <h2 className="text-2xl font-bold mb-4 text-[#2c2c2c]">Send Message</h2>

      <input
        type="text"
        className="w-full border border-[#e4ecaa] px-4 py-2 mb-4 rounded bg-white text-[#2c2c2c]"
        placeholder="Enter Title (Optional)"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      <textarea
        className="w-full border border-[#e4ecaa] px-4 py-2 mb-4 rounded bg-white text-[#2c2c2c]"
        rows={4}
        placeholder="Enter Message*"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        required
      />

      <div className="relative mb-4" ref={dropdownRef}>
        <div
          className="w-full border border-[#e4ecaa] px-4 py-2 rounded bg-white text-[#2c2c2c] flex justify-between items-center cursor-pointer"
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        >
          <span>{getSelectedRecipientNames()}</span>
          <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
            <path d="M7 10l5 5 5-5H7z"></path>
          </svg>
        </div>

        {isDropdownOpen && (
          <div className="absolute left-0 right-0 mt-1 bg-white border border-[#e4ecaa] rounded shadow-lg z-10">
            <div className="p-2">
              <input
                type="text"
                className="w-full border border-[#e4ecaa] px-3 py-1 rounded text-[#2c2c2c]"
                placeholder="Search recipients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
            </div>

            <div className="max-h-48 overflow-y-auto">
              <div
                className={`px-4 py-2 hover:bg-[#e4ecaa] cursor-pointer ${
                  selectedRecipients.includes("all") ? "bg-[#e4ecaa]" : ""
                }`}
                onClick={() => toggleRecipient("all")}
              >
                {isHR ? "All Store Employees" : "All Employees"}
              </div>

              {filteredRecipients.map((recipient) => (
                <div
                  key={recipient.id}
                  className={`px-4 py-2 hover:bg-[#e4ecaa] cursor-pointer ${
                    selectedRecipients.includes(recipient.id)
                      ? "bg-[#e4ecaa]"
                      : ""
                  }`}
                  onClick={() => toggleRecipient(recipient.id)}
                >
                  {recipient.name}
                </div>
              ))}

              {filteredRecipients.length === 0 && searchQuery && (
                <div className="px-4 py-2 text-gray-500">
                  No recipients found
                </div>
              )}

              {employees.length === 0 && !searchQuery && (
                <div className="px-4 py-2 text-gray-500">
                  {isHR
                    ? "No employees in your store"
                    : "No employees available"}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2">
        <button
          className="bg-[#e4ecaa] text-[#2c2c2c] px-4 py-2 rounded hover:bg-opacity-80"
          onClick={onClose}
        >
          Cancel
        </button>
        <button
          className="bg-[#b4ca01] text-[#2c2c2c] px-4 py-2 rounded hover:bg-opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleSend}
          disabled={!description.trim()}
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default PushMessage;
