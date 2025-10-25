import { IconType } from "react-icons/lib";

export interface SidebarLink {
  name: string;
  icon: IconType;
  path: string;
}

export interface PersonalDetails {
  // id: string;
  email: string;
  username: string;
  role: string;
  // userType: string;
  empNo: string;
  address: string;
  // city: string;
  contact: string;
  altContact: string;
  // govtID: string;
  phone_number: string;
  alt_phone_number: string;
  aadhar_number: {
    value: string;
    uploadable: boolean;
  };
  pan_number: {
    value: string;
    uploadable: boolean;
  };
  present_address: string;
  email_address: string;
  userType: string;
  reportingManager: string;
  store: string;
  dob: string;
  // doj: string;
  createdAt: string;
  tenure: string;
  restricted: boolean | string;
  permanent_address: string;
  fatherName: string;
  fatherPhone: string;
  motherName: string;
  motherPhone: string;
  police_verification: {
    value: string;
    uploadable: boolean;
  };
}

export type LeaveRequest = {
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
};

export interface LeaveHistoryEntry {
  historyId: string;
  leaveId: string;
  employeeId: string;
  status: string;
  remark: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Employee {
  username: string;
}

export interface LeaveRecord {
  leaveId: string;
  employeeId: string;
  startDate: string;
  endDate: string;
  isHalfDayStart: boolean;
  isHalfDayEnd: boolean;
  startHalfPeriod: string | null;
  endHalfPeriod: string | null;
  reason: string;
  status: string;
  effectiveDays: number;
  approvedById: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  LeaveHistory: LeaveHistoryEntry[];
  Employee: Employee;
  ApprovedBy: any | null;
  employeeName: string;
}

export type LeaveHistory = LeaveRecord[];
