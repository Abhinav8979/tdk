"use client";

import {
  hrAccessProfileNames,
  sidebarLinks,
  hrSideBarLink,
} from "@/lib/constants";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getCurrentYear } from "@/utils/helperFunctions";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { rootEmployeeRoute, rootHrRoute } from "@/lib/paths";
import { setLoading } from "@/redux/store/utils";
import { useAppDispatch } from "@/hooks/ReduxSelector";
import { IconType } from "react-icons";
import { IoMdClose } from "react-icons/io";

type SidebarLink = {
  name: string;
  path: string;
  icon: IconType;
};

interface SidebarProps {
  collapse: boolean;
  setCollapse: (val: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ collapse, setCollapse }) => {
  const pathname = usePathname();
  const year = getCurrentYear();
  const { data: session } = useSession();
  const userType = hrAccessProfileNames.includes(session?.user?.profile ?? "")
    ? "hr"
    : "employee";

  const dispatch = useAppDispatch();

  const links: SidebarLink[] = userType === "hr" ? hrSideBarLink : sidebarLinks;

  // ✅ Helper to close sidebar only on mobile
  const handleCloseOnMobile = () => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setCollapse(true);
    }
  };

  return (
    <aside
      className={`${
        collapse ? "w-0 hidden" : "md:w-52 w-screen h-screen z-40"
      } transition-all duration-300 backdrop-blur-md bg-white/30 shadow-xl p-6 absolute md:relative flex flex-col justify-between border-r border-white/20`}
    >
      <div>
        {/* ✅ Close button only on mobile */}
        <button
          onClick={() => setCollapse(true)}
          className="absolute top-4 left-4 md:hidden p-2 rounded-full hover:bg-gray-200"
        >
          <IoMdClose size={24} />
        </button>

        <Link
          onClick={() => {
            dispatch(setLoading(true));
            handleCloseOnMobile(); // ✅ close only if <768px
          }}
          href={userType === "hr" ? rootHrRoute : rootEmployeeRoute}
          className="flex justify-center"
        >
          <Image
            src="/logo.png"
            width={collapse ? 50 : 200}
            height={collapse ? 50 : 200}
            alt="Avea"
            priority
            loading="eager"
            className="mb-8"
          />
        </Link>

        <nav className="space-y-2">
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = pathname.includes(link.path);

            return (
              <Link
                onClick={() => {
                  dispatch(setLoading(true));
                  handleCloseOnMobile(); // ✅ close only if <768px
                }}
                href={link.path}
                key={link.name}
                className={`flex items-center gap-4 p-3 text-sm rounded-xl transition-all duration-200 font-medium ${
                  isActive
                    ? "bg-[var(--secondary-background)] text-black"
                    : "text-[#393e46] hover:bg-[var(--secondary-background)] hover:text-black"
                }`}
              >
                <Icon className="w-5 h-5 shrink-0" />
                {!collapse && <span>{link.name}</span>}
              </Link>
            );
          })}
        </nav>
      </div>

      {!collapse && (
        <div className="text-sm text-center opacity-70">
          © {year} {userType === "hr" ? "HR" : "Employee"} Panel
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
