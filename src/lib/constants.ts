import { SidebarLink } from "@/types/employeeDashboard.types";
import { FaWallet, FaCalendarCheck, FaUser } from "react-icons/fa";
import { MdCalendarToday } from "react-icons/md";

import {
  FaIdBadge,
  FaRegCalendarAlt,
  FaMoneyCheckAlt,
  FaClock,
  FaPaperPlane,
} from "react-icons/fa";
import { rootEmployeeRoute, rootHrRoute } from "./paths";

export const sidebarLinks: SidebarLink[] = [
  {
    name: "Personal Details",
    icon: FaUser,
    path: rootEmployeeRoute + "/personal-details",
  },
  {
    name: "Holiday Calendar",
    icon: MdCalendarToday,
    path: rootEmployeeRoute + "/leave-calendar",
  },
  { name: "Expenses", icon: FaWallet, path: rootEmployeeRoute + "/expenses" },
  {
    name: "Attendance",
    icon: FaCalendarCheck,
    path: rootEmployeeRoute + "/attendance",
  },
  {
    name: "Payslip",
    icon: FaPaperPlane,
    path: rootEmployeeRoute + "/payslip",
  },
];

export const hrSideBarLink: SidebarLink[] = [
  {
    name: "Employee Details",
    icon: FaIdBadge,
    path: rootHrRoute + "/employee-details",
  },
  {
    name: "Leave",
    icon: FaRegCalendarAlt,
    path: rootHrRoute + "/leave-calendar",
  },
  {
    name: "Manage Expenses",
    icon: FaMoneyCheckAlt,
    path: rootHrRoute + "/manage-expenses",
  },
  {
    name: "Employee Attendance",
    icon: FaClock,
    path: rootHrRoute + "/attendance",
  },
  {
    name: "Payslips",
    icon: FaPaperPlane,
    path: rootHrRoute + "/payslips",
  },
];

export const attendance = [
  {
    employeeId: "EMP001",
    employeeName: "John Doe",
    department: "Engineering",
    date: "2025-05-09",
    status: "present",
    inTime: "2025-05-09T09:00:00.000Z",
    outTime: "2025-05-09T17:30:00.000Z",
    isLateEntry: false,
    isEarlyExit: false,
  },
  {
    employeeId: "EMP002",
    employeeName: "Jane Smith",
    department: "Marketing",
    date: "2025-05-09",
    status: "present",
    inTime: "2025-05-09T09:15:00.000Z",
    outTime: "2025-05-09T17:00:00.000Z",
    isLateEntry: true,
    isEarlyExit: true,
  },
  {
    employeeId: "EMP003",
    employeeName: "Mike Johnson",
    department: "Finance",
    date: "2025-05-09",
    status: "absent",
    inTime: null,
    outTime: null,
    isLateEntry: false,
    isEarlyExit: false,
  },
  {
    employeeId: "EMP004",
    employeeName: "Sarah Williams",
    department: "Human Resources",
    date: "2025-05-09",
    status: "present",
    inTime: "2025-05-09T08:45:00.000Z",
    outTime: "2025-05-09T18:00:00.000Z",
    isLateEntry: false,
    isEarlyExit: false,
  },
  {
    employeeId: "EMP005",
    employeeName: "David Chen",
    department: "Operations",
    date: "2025-05-09",
    status: "present",
    inTime: "2025-05-09T08:50:00.000Z",
    outTime: "2025-05-09T16:45:00.000Z",
    isLateEntry: false,
    isEarlyExit: true,
  },
  // Previous day data
  {
    employeeId: "EMP001",
    employeeName: "John Doe",
    department: "Engineering",
    date: "2025-05-08",
    status: "present",
    inTime: "2025-05-08T09:05:00.000Z",
    outTime: "2025-05-08T17:35:00.000Z",
    isLateEntry: true,
    isEarlyExit: false,
  },
  {
    employeeId: "EMP002",
    employeeName: "Jane Smith",
    department: "Marketing",
    date: "2025-05-08",
    status: "absent",
    inTime: null,
    outTime: null,
    isLateEntry: false,
    isEarlyExit: false,
  },
  // Next day data
  {
    employeeId: "EMP001",
    employeeName: "John Doe",
    department: "Engineering",
    date: "2025-05-10",
    status: "present",
    inTime: "2025-05-10T08:55:00.000Z",
    outTime: "2025-05-10T17:30:00.000Z",
    isLateEntry: false,
    isEarlyExit: false,
  },
  // Add more data for the entire month of May 2025
  {
    employeeId: "EMP001",
    employeeName: "John Doe",
    department: "Engineering",
    date: "2025-05-12",
    status: "present",
    inTime: "2025-05-12T08:55:00.000Z",
    outTime: "2025-05-12T17:30:00.000Z",
    isLateEntry: false,
    isEarlyExit: false,
  },
  {
    employeeId: "EMP001",
    employeeName: "John Doe",
    department: "Engineering",
    date: "2025-05-13",
    status: "absent",
    inTime: null,
    outTime: null,
    isLateEntry: false,
    isEarlyExit: false,
  },
  {
    employeeId: "EMP001",
    employeeName: "John Doe",
    department: "Engineering",
    date: "2025-05-14",
    status: "present",
    inTime: "2025-05-14T09:10:00.000Z",
    outTime: "2025-05-14T17:45:00.000Z",
    isLateEntry: true,
    isEarlyExit: false,
  },
  {
    employeeId: "EMP002",
    employeeName: "Jane Smith",
    department: "Marketing",
    date: "2025-05-14",
    status: "present",
    inTime: "2025-05-14T09:00:00.000Z",
    outTime: "2025-05-14T16:30:00.000Z",
    isLateEntry: false,
    isEarlyExit: true,
  },
  {
    employeeId: "EMP003",
    employeeName: "Mike Johnson",
    department: "Finance",
    date: "2025-05-15",
    status: "present",
    inTime: "2025-05-15T08:45:00.000Z",
    outTime: "2025-05-15T17:15:00.000Z",
    isLateEntry: false,
    isEarlyExit: false,
  },
  {
    employeeId: "EMP004",
    employeeName: "Sarah Williams",
    department: "Human Resources",
    date: "2025-05-03",
    status: "present",
    inTime: "2025-05-03T09:00:00.000Z",
    outTime: "2025-05-03T17:00:00.000Z",
    isLateEntry: false,
    isEarlyExit: false,
  },
];

export const hrAccessProfileNames = [
  "hr_coordinator",
  "hr_coordinator_manager ",
  "md",
  // "store_director",
];

export const storeChangePermission = [
  // "hr_coordinator",
  "store_director",
  // "hr_coordinator_manager ",
  "md",
];


