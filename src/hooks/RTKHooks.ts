"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import axios from "axios";

import type { LoginFormValues } from "@/types/login.type";
import type {
  LeaveHistory,
  LeaveRequest,
  PersonalDetails,
} from "@/types/employeeDashboard.types";
import { EmployeeDetails, ExpensePayload } from "@/types/hrDashboard.types";

export function useLoginMutation() {
  const router = useRouter();

  return useMutation({
    mutationFn: async (data: LoginFormValues) => {
      const result = await signIn("credentials", {
        redirect: false,
        email: data.email,
        password: data.password,
      });

      if (result?.error) {
        toast.warning("Invalid email or password");
        return result;
      }

      if (result?.ok) {
        toast.success("Login Successful");
        // TODO: Add condition to redirect accordingly
        router.push("?terms&condition");
      }

      return result;
    },
    onError: () => {
      toast.error("Something went wrong!");
    },
  });
}

export const useUser = () => {
  return useQuery<PersonalDetails>({
    queryKey: ["user"],
    queryFn: async () => {
      const { data } = await axios.get("/api/user");
      return data;
    },
  });
};

export const useGetEmployeeSummary = (id: string | undefined) => {
  return useQuery({
    queryKey: ["EmployeeSummary"],
    queryFn: async () => {
      const { data } = await axios.get(`/api/user/summary?employeeId=${id}`);
      return data;
    },
    enabled: !!id,
  });
};

export const useEmployeeDetals = (storeName?: string) => {
  return useQuery<EmployeeDetails[]>({
    queryKey: ["employeeDetails", storeName],
    queryFn: async () => {
      let url = "/api/user?all=true";
      if (storeName && storeName !== "all") {
        url += `&storeName=${storeName}`;
      }
      const { data } = await axios.get(url);
      return data;
    },
    enabled: !!storeName,
  });
};

export const useSearchEmployee = () =>
  useMutation({
    mutationFn: async (id: string) => {
      const response = await axios.get("/api/user?id=" + id);
      return response.data;
    },
    onError: (error) => {
      console.error("Error searching employee", error);
      toast.error("Failed to search employee");
    },
    onSuccess: (data) => {
      console.log("Employee search successful", data);
      toast.success("Employee found successfully");
    },
  });

export const usePutEmployeeDetails = () =>
  useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await axios.put("/api/user?id=" + id, data);
      return response.data;
    },
    onError: (error) => {
      console.error("Error updating employee details", error);
      toast.error("Failed to update employee details");
    },
    onSuccess: (data) => {
      toast.success("Employee details updated successfully");
    },
  });

export const useUpdateEmployee = () => {
  return useMutation({
    mutationFn: async (updatePayload: {
      id: string; // required
      name?: string;
      email?: string;
      role?: string;
      // Add any other fields that can be updated
    }) => {
      const { data } = await axios.put("/api/user", updatePayload);
      return data;
    },
    onError: (error) => {
      console.error("Error updating employee", error);
      toast.error("Failed to update employee");
    },
    onSuccess: () => {
      toast.success("Employee updated successfully");
    },
  });
};

export const useReportingManager = () => {
  return useMutation({
    mutationFn: async (empId: string) => {
      const { data } = await axios.get("/api/user?empId=" + empId);
      return data.username;
    },
    onError: (error) => {
      console.error("Error fetching reporting manager", error);
      toast.error("Failed to fetch reporting manager");
    },
    onSuccess: () => {
      toast.success("Reporting manager fetched successfully");
    },
  });
};

// Calendar
export const useGetCalendarLeaves = (storeFilter: string | null) => {
  let url = "/api/store-settings/holiday";
  if (storeFilter && storeFilter !== "all") {
    url += `?store=${storeFilter}`;
  }

  return useQuery({
    queryKey: ["calendarLeaves", storeFilter],
    queryFn: async () => {
      const { data } = await axios.get(url);
      return data;
    },
    enabled: !!storeFilter,
  });
};

export const useCreateCalendarLeave = () => {
  return useMutation({
    mutationFn: async ({
      date,
      reason,
      title,
      storeName,
      editing,
    }: {
      date: null | string;
      reason: string;
      title: string;
      storeName: string;
      editing: boolean;
    }) => {
      const { data } = await axios("/api/store-settings", {
        method: editing ? "PUT" : "POST",
        data: {
          date,
          name: reason,
          description: title,
          storeName,
        },
      });
      return data;
    },
    onError: (error) => {
      toast.error("Failed to create calendar leave");
    },
  });
};

export const useDeleteCalendarLeave = () => {
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await axios.delete("/api/store-settings/holiday/" + id);
      return data;
    },
    onError: (error) => {
      console.error("Error deleting calendar leave", error);
      toast.error("Failed to delete calendar leave");
    },
    onSuccess: () => {
      toast.success("Calendar leave deleted successfully");
    },
  });
};

// push message
export const usePushMessage = () =>
  useMutation({
    mutationFn: async (messageData: {
      message: string;
      type: string;
      expiryTime: string;
      recipientType: "INDIVIDUAL" | "STORE";
      userId?: string;
      storeId?: string;
    }) => {
      const response = await axios.post("/api/push-message", messageData);
      return response.data;
    },
    onError: (error) => {
      console.error("Error pushing message", error);
      toast.error("Failed to send message");
    },
    onSuccess: (data) => {
      console.log("Message pushed successfully", data);
      toast.success("Message sent successfully");
    },
  });

export const useGetNotificationHistory = () => {
  return useQuery({
    queryKey: ["notificationHistory"],
    queryFn: async () => {
      const { data } = await axios.get(`/api/push-message/history`);
      return data;
    },
  });
};

// employee details
export const usePersonalDetails = () => {
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await axios.get("/api/user?id=" + id);
      return data;
    },
    onError: (error) => {
      console.error("Error fetching personal details", error);
      toast.error("Failed to fetch personal details");
    },
    onSuccess: () => {
      toast.success("Personal details fetched successfully");
    },
  });
};

// Expenses

export const useEmployeeExpenses = () =>
  useMutation({
    mutationFn: async (hrId: string) => {
      const response = await axios.delete("/api/expenses", {
        data: { hrId },
      });
      return response.data;
    },
    onError: (error) => {
      console.error("Error deleting employee expenses", error);
      toast.error("Failed to delete employee expenses");
    },
    onSuccess: (data) => {
      console.log("Employee expenses deleted successfully", data);
      toast.success("Employee expenses deleted successfully");
    },
  });

interface ExpenseUpdatePayload {
  date?: string;
  initialReading?: number;
  finalReading?: number;
  rate?: number;
  miscellaneousExpense?: number;
}
export const useUpdateEmployeeExpensesByEmployee = () =>
  useMutation({
    mutationFn: async ({
      employeeId,
      date,
      payload,
    }: {
      employeeId: string;
      date: string;
      payload: ExpenseUpdatePayload;
    }) => {
      console.log(payload);
      const response = await axios.put(
        `/api/expenses/by-employee/${employeeId}?date=${date}`,
        payload
      );
      return response.data;
    },
    onError: (error) => {
      console.error("Error updating expense", error);
      toast.error("Failed to update expense");
    },
    onSuccess: (data) => {
      console.log("Expense update successful", data);
      toast.success("Expense updated successfully");
    },
  });

export const usePostEmployeeExpenses = () =>
  useMutation({
    mutationFn: async ({
      type,
      payload,
    }: {
      type: "POST" | "PUT";
      payload: ExpensePayload;
    }) => {
      const url =
        type === "POST"
          ? "/api/expenses"
          : "/api/expenses/?id=" + payload.employeeId;
      const response = await axios(url, {
        method: type,
        data: payload,
      });
      return response.data;
    },
    onError: (error) => {
      console.error("Error creating expense:", error);
      toast.error(`Failed`);
    },
    onSuccess: (data) => {
      console.log("Expense created successfully:", data);
      toast.success(`Success!`);
    },
  });

export const useGetEmployeeExpenses = (params = {}) => {
  const queryKey = ["Expenses", params];
  const query = new URLSearchParams(params).toString();

  return useQuery({
    queryKey,
    queryFn: async () => {
      const { data } = await axios.get(`/api/expenses?${query}`);
      return data;
    },
    enabled: !!params,
  });
};

// salaries
export const useGetSalaries = (params = {}) => {
  const queryKey = ["Salaries", params];

  return useQuery({
    queryKey,
    queryFn: async () => {
      const query = new URLSearchParams(params).toString();
      const { data } = await axios.get(`/api/salaries?${query}`);
      return data;
    },
    enabled: !!params,
  });
};

// Attendance

export const useGetEmployeeAttendance = (params = {}) => {
  const queryKey = ["EmployeeAttendance", params];

  return useQuery({
    queryKey,
    queryFn: async () => {
      const query = new URLSearchParams(params).toString();
      const { data } = await axios.get(
        `/api/attendance/getAttendance?${query}`
      );
      return data;
    },
    enabled: !!params,
  });
};

export const useGetEmployeeAttendanceSummary = (params: any = {}) => {
  const queryKey = ["EmployeeAttendanceSummary", params];

  return useQuery({
    queryKey,
    queryFn: async () => {
      const { data } = await axios.get(`/api/attendance/summary/${params.id}`);
      return data;
    },
    enabled: !!params,
  });
};

// TimeOffs

export const useGetStoreEmployess = () => {
  const queryKey = ["individualPayslip"];

  return useQuery({
    queryKey,
    queryFn: async () => {
      const { data } = await axios.get(`/api/store-settings/getStore`);
      return data;
    },
  });
};

export const useUpdateTimeOffs = () =>
  useMutation({
    mutationFn: async ({
      action,
      payload,
    }: {
      action: "times" | "calendar";
      payload: {
        expectedInTime?: string | undefined;
        expectedOutTime?: string | undefined;
        lateEntryThreshold?: number | undefined;
        earlyExitThreshold?: number | undefined;
        leaveDay?: string | undefined;
        weekdayOff?: string;
        // numberOfLeaves: number;
      };
    }) => {
      const response = await axios.put("/api/store-settings?action=" + action, {
        data: payload,
      });
      return response;
    },
    onError: (error) => {
      console.error("Error updating time offs", error);
      toast.error("Failed to update time off settings");
    },
    onSuccess: (data) => {
      console.log("Time off settings updated successfully", data);
      toast.success("Time off settings updated successfully");
    },
  });

// Leave Request
export const useCreateLeave = () =>
  useMutation({
    mutationFn: async (data: LeaveRequest) => {
      const response = await axios.post("/api/leaves/create", data);
      return response.data;
    },
    onError: (error) => {
      console.error("Error creating leave request", error);
      toast.error("Failed to create leave request");
    },
    onSuccess: () => {
      toast.success("Leave request created successfully");
    },
  });

export const useGetLeaves = (params = {}) => {
  const queryKey = ["leaves", params];

  return useQuery({
    queryKey,
    queryFn: async () => {
      const query = new URLSearchParams(params).toString();
      const { data } = await axios.get(`/api/leaves/get?${query}`);
      return data;
    },
    enabled: !!params,
  });
};

interface ApproveLeavePayload {
  leaveId: string;
  status: "approved" | "rejected";
  remark?: string;
}

export const useApproveLeaveStatus = () => {
  return useMutation({
    mutationFn: async (updateData: ApproveLeavePayload) => {
      const response = await axios.put("/api/leaves/approve", updateData, {
        headers: {
          "Content-Type": "application/json",
        },
      });
      return response.data;
    },
    onError: (error) => {
      console.error("Error updating leave status", error);
      toast.error("Failed to update leave status");
    },
    onSuccess: (data) => {
      console.log("Leave status updated successfully", data);
      toast.success(`Leave ${data.status} successfully`);
    },
  });
};

export const useLeaveHistory = () => {
  return useQuery<LeaveHistory>({
    queryKey: ["leaveHistory"],
    queryFn: async () => {
      const { data } = await axios.get("/api/leaves/history");
      return data.leaves;
    },
  });
};

export const useWithdrawLeave = () =>
  useMutation({
    mutationFn: async (leaveId: string) => {
      const response = await axios.delete("/api/leaves/withdraw", {
        data: { leaveId },
      });
      return response.data;
    },
    onError: (error) => {
      console.error("Error withdrawing leave", error);
      toast.error("Failed to withdraw leave");
    },
    onSuccess: (data) => {
      console.log("Leave withdrawal successful", data);
      toast.success("Leave withdrawn successfully");
    },
  });

// Overtime Request

export const useCreateOvertimeRequest = () =>
  useMutation({
    mutationFn: async (payload: any) => {
      const response = await axios.post("/api/overtime-requests", {
        data: { payload },
      });
      return response;
    },
    onError: (error) => {
      console.error("Error creating overtime request", error);
      toast.error("Failed to create overtime request");
    },
    onSuccess: (data) => {
      console.log("Overtime request created successfully", data);
      toast.success("Overtime request created successfully");
    },
  });

export const useGetOvertimeRequest = (params = {}) => {
  const queryKey = ["overtimeRequest", params];

  return useQuery({
    queryKey,
    queryFn: async () => {
      const query = new URLSearchParams(params).toString();
      const { data } = await axios.get(`/api/overtime-requests?${query}`);
      return data;
    },
    enabled: !!params,
  });
};

export const useUpdateOvertimeRequest = () =>
  useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      const response = await axios.put("/api/overtime-requests/" + id, {
        data: { payload },
      });
      return response;
    },
    onError: (error) => {
      console.error("Error updating overtime request", error);
      toast.error("Failed to update overtime request");
    },
    onSuccess: (data) => {
      console.log("Overtime request updated successfully", data);
      toast.success("Overtime request updated successfully");
    },
  });

//  PAYSLIP
export const useGetPayslips = (params = {}) => {
  const queryKey = ["payslips", params];

  return useQuery({
    queryKey,
    queryFn: async () => {
      const query = new URLSearchParams(params).toString();
      const { data } = await axios.get(`/api/salaries?${query}`);
      return data;
    },
    enabled: !!params,
  });
};

export const useGetIndividualPayslip = (params = {}) => {
  const queryKey = ["individualPayslip", params];

  return useQuery({
    queryKey,
    queryFn: async () => {
      const query = new URLSearchParams(params).toString();
      const { data } = await axios.get(`/api/salaries?${query}`);
      return data;
    },
    enabled: !!params,
  });
};

export const useSavePayslip = () =>
  useMutation({
    mutationFn: async ({
      isFirstTime,
      payload,
      id,
    }: {
      isFirstTime: boolean;
      payload: any;
      id: string;
    }) => {
      let url = "";
      let method: "POST" | "PUT" = "POST";
      let data = { payload };

      if (isFirstTime) {
        const searchParams = new URLSearchParams(payload).toString();
        url = `/api/salaries?${searchParams}`;
      } else {
        url = `/api/salaries/${id}`;
        method = "PUT";
      }

      const response = await axios({
        method,
        url,
        data,
      });

      return response;
    },
    onError: (error) => {
      toast.error("Something went wrong while saving payslip");
      console.error("Error salary", error);
    },
    onSuccess: (data) => {
      toast.success("Payslip saved successfully");
      console.log("Payslip saved", data);
    },
  });

// query

export const useSendQuery = () =>
  useMutation({
    mutationFn: async (data: { subject: string; message: string }) => {
      const response = await axios.post("/api/contact-hr", data);
      return response.data;
    },
    onError: () => {
      toast.error("Something went wrong!");
    },
    onSuccess: () => {
      toast.success("Email sent successfully!");
    },
  });

// policy

export const useGetPolicy = (params = {}) => {
  const queryKey = ["policy", params];

  return useQuery({
    queryKey,
    queryFn: async () => {
      const query = new URLSearchParams(params).toString();
      const { data } = await axios.get(`/api/policy/${query}`);
      return data;
    },
    enabled: !!params,
  });
};

export const usePostPolicy = (id: string) =>
  useMutation({
    mutationFn: async (data: FormData) => {
      console.log(id);
      const response = await axios.post(`/api/policy/${id}`, data, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      return response.data;
    },
    onError: () => {
      toast.error("Something went wrong!");
    },
    onSuccess: () => {
      toast.success("policy updated successfully!");
    },
  });

export const useDeletePolicy = (id: string) =>
  useMutation({
    mutationFn: async (policyId: any) => {
      console.log(id);
      console.log(policyId);
      const response = await axios.delete(
        `/api/policy/${id}?policyId=${policyId}`,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      return response.data;
    },
    onError: () => {
      toast.error("Something went wrong!");
    },
    onSuccess: () => {
      toast.success("policy updated successfully!");
    },
  });

// GET ALL STORE NAMES

export const useGetAllStoreNames = (accessAll: boolean) => {
  return useQuery({
    queryKey: ["allStoreNames"],
    queryFn: async () => {
      const { data } = await axios.get("/api/store-settings/getAllStore");
      return data.stores;
    },
    enabled: accessAll,
  });
};
