export interface EmployeeDetails {
  id: string;
  email: string;
  username: string;
  role: string; // e.g., "ADMIN"
  userType: string; // e.g., "manager"
  empNo: string;
  store: string;
  store_info: any | null;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
  address: string;
  city: string;
  contact: string;
  altContact: string | null;
  govtID: string;
  restricted: boolean;
  referenceEmployee: string | null;
  reportingManager: string | null;
  aadhar_number: string | null;
  pan_number: string | null;
  dob: string | null;
  police_verification: string | null;
  additionalDocuments: any[]; // assuming documents can be any structure
  isHrPortalFirstLogin: boolean;
  fatherName: string | null;
  fatherPhone: string | null;
  motherName: string | null;
  motherPhone: string | null;
  reportingManagerName?: string;
}

export interface AttendanceRecord {
  employeeId: string;
  employeeName: string;
  department: string;
  date: string;
  status: "present" | "absent";
  inTime: string | null;
  outTime: string | null;
  isLateEntry: boolean;
  isEarlyExit: boolean;
}

export interface ExpensePayload {
  employeeId: string;
  date: string;
  initialReading: number;
  finalReading: number;
  rate: number;
  miscellaneousExpense?: number;
  // type: "POST" | "PUT";
}

// types/LeaveRequest.ts

export interface LeaveRequest {
  leaveId: string;
  employeeId: string;
  employeeName: string;
  startDate: string;
  endDate: string;
  isHalfDayStart: boolean;
  isHalfDayEnd: boolean;
  startHalfPeriod: string | null;
  endHalfPeriod: string | null;
  reason: string;
  status: "pending" | "approved" | "rejected";
  approvalStage: "manager" | "hr" | string;
  managerApprovedBy: string | null;
  effectiveDays: number;
  createdAt: string;
  updatedAt: string;

  // Optional/Extra fields shown in your UI but not in the response
  leaveType?: string;
  department?: string;
  days?: number;
  appliedDate?: string; // fallback for filters
}

export interface EmployeeExpenses {
  id: string;
  employeeId: string;
  employeeName: string;
  email: string;
  storeName: string;
  initialReading: string;
  finalReading: string;
  rate: number;
  date: string;
  miscellaneousExpense: number;
  isUpdatedOnce: boolean;
}
