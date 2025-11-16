"use client";
import PolicyUploadModal from "@/components/modal/Policy";
import Button from "@/components/ui/button/Button";
import { useAppDispatch } from "@/hooks/ReduxSelector";
import { useReportingManager } from "@/hooks/RTKHooks";
import ModalLayout from "@/layouts/ModalLayout";
import { rootHrRoute } from "@/lib/paths";
import { setLoading } from "@/redux/store/utils";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { FaEnvelope, FaBuilding, FaCreditCard, FaUsers } from "react-icons/fa";

interface UserData {
  userId?: string;
  email?: string;
  username?: string;
  profilePicture?: string | null;
  isHrPortalFirstLogin?: boolean;
  userType?: string;
  role?: string;
  referenceEmployee?: string | null;
  reportingManager?: string;
  empNo?: string;
  restricted?: boolean;
  storeId?: string;
  store?: string;
}

export default function HRInfoPage() {
  const session = useSession();
  const [userData, setUserData] = useState<UserData>({});
  const [activeTab, setActiveTab] = useState<"profile" | "access">("profile");
  const [modal, setModal] = useState(false);

  const [reportingManager, setReportingManager] = useState("");

  const { mutate: getReportingManager } = useReportingManager();

  const dispatch = useAppDispatch();

  useEffect(() => {
    if (session.status === "authenticated") {
      setUserData(session.data.user as UserData);
      const managerId = session.data.user?.reportingManager;
      if (typeof managerId === "string" && managerId.trim() !== "") {
        getReportingManager(managerId, {
          onSuccess: (data) => {
            setReportingManager(data);
          },
        });
      }
    }
  }, [session.status, session.data]);

  if (session.status !== "authenticated") {
    return null;
  }

  return (
    <div className="flex flex-col min-h-screen bg-[var(--tertiary-background)]">
      <div className="flex-1 py-6">
        <div className="max-w-6xl mx-auto">
          <header className="mb-8">
            <p className="text-gray-600">
              Welcome back, {userData.username || "User"}
            </p>
          </header>

          <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
            <div className="bg-[var(--primary-background)] p-6 text-[var(--foreground)]">
              <div className="flex items-center">
                <div className="bg-[var(--secondary-background)] rounded-full w-20 h-20 flex items-center justify-center text-3xl font-bold text-[var(--foreground)]">
                  {userData.username?.charAt(0) ?? "U"}
                </div>
                <div className="ml-6">
                  <h2 className="text-2xl font-bold">{userData.username}</h2>
                  <p className="text-[var(--foreground)] opacity-90">
                    {userData.userType?.toUpperCase()} • {userData.role}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="border-b border-gray-200 mb-6">
                <nav className="flex -mb-px">
                  <TabButton
                    label="Profile Information"
                    active={activeTab === "profile"}
                    onClick={() => setActiveTab("profile")}
                  />
                </nav>
              </div>

              {activeTab === "profile" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <InfoCard
                    icon={<FaEnvelope />}
                    title="Email"
                    value={userData.email}
                  />
                  <InfoCard
                    icon={<FaCreditCard />}
                    title="Employee Number"
                    value={userData.empNo}
                    // value={reportingManager}
                  />
                  <InfoCard
                    icon={<FaUsers />}
                    title="Reporting Manager"
                    // value={userData.reportingManager}
                    value={reportingManager}
                  />
                  <InfoCard
                    icon={<FaBuilding />}
                    title="Store"
                    value={userData.store}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4 text-[var(--foreground)]">
              Quick Actions
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <ActionButton
                onClick={() => dispatch(setLoading(true))}
                link={`${rootHrRoute + "/employee-details"}`}
              >
                View Employee Directory
              </ActionButton>
              <ActionButton
                onClick={() => dispatch(setLoading(true))}
                link={`${rootHrRoute + "/attendance?manageTimeOff=true"}`}
              >
                Manage Time Off
              </ActionButton>
              <ActionButton
                onClick={() => dispatch(setLoading(true))}
                link={`${rootHrRoute + "/attendance"}`}
              >
                View Attendance
              </ActionButton>
              <TabButton
                label="Update/View Profile"
                onClick={() => setModal(true)}
              />
              {modal && (
                <ModalLayout>
                  <PolicyUploadModal
                    id={userData.userId}
                    onClose={() => setModal(false)}
                  />
                </ModalLayout>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface InfoCardProps {
  icon: React.ReactNode;
  title: string;
  value?: string | boolean;
}

function InfoCard({ icon, title, value }: InfoCardProps) {
  return (
    <div className="bg-[var(--tertiary-background)] p-4 rounded-lg flex items-start">
      <div className="text-[var(--primary-background)] mr-3 mt-1">{icon}</div>
      <div>
        <p className="text-sm text-gray-500">{title}</p>
        <p className="font-medium text-[var(--foreground)]">
          {String(value) || "N/A"}
        </p>
      </div>
    </div>
  );
}

interface ActionButtonProps {
  children: React.ReactNode;
  link: string;
  onClick?: () => void;
}

function ActionButton({
  children,
  link,
  onClick = () => {},
}: ActionButtonProps) {
  return (
    <Button onClick={onClick} size="sm" variant="primary">
      <Link href={link}>{children}</Link>
    </Button>
  );
}

interface TabButtonProps {
  label: string;
  active?: boolean;
  onClick: () => void;
}

function TabButton({ label, active, onClick }: TabButtonProps) {
  return (
    <Button
      variant="none"
      onClick={onClick}
      className={`mr-8 py-4 px-1 border-b-2 font-medium text-sm ${
        active
          ? "border-[var(--primary-background)] text-[var(--primary-background)]"
          : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
      }`}
    >
      {label}
    </Button>
  );
}
