export type TermsModalProps = {
  onAgree: () => void;
};

export interface LeaveFormValues {
  startDate: string;
  endDate: string;
  reason: string;
  leaveType?: "full" | "half";
}

export interface Leave {
  leaveId: string;
  startDate: string;
  endDate: string;
  isHalfDayStart: boolean;
  isHalfDayEnd: boolean;
  startHalfPeriod: string | null;
  endHalfPeriod: string | null;
  reason: string;
  status: string;
  effectiveDays: number;
  employeeId?: string;
  employee: { username: string };
  approvedBy?: { username: string } | null;
}

export interface Holiday {
  holidayId: string;
  date: string;
  name: string;
  description: string | null;
}

export interface Attendance {
  attendanceId: string;
  employeeId: string;
  date: string;
  status: "leave" | "absent" | "present";
  employee: { username: string; empNo: string | null };
}

export interface OvertimeRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  hours: number;
  remarks: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  approvedHours?: number;
  approverId: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
