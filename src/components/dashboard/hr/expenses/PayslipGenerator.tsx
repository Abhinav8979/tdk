"use client";
import { FaArrowLeft, FaDownload, FaSave } from "react-icons/fa";
import React, { useState, useEffect } from "react";
import {
  useGetEmployeeExpenses,
  useGetIndividualPayslip,
  useSavePayslip,
} from "@/hooks/RTKHooks";
import PayslipGeneratorSkeleton from "@/components/skeleton/Hr/payslipGenerator/PayslipGeneratorSkeleton";
import { useRouter } from "next/navigation";
import { MdOutlinePublish, MdLock } from "react-icons/md";

interface EmployeeData {
  employeeName: string;
  department: string;
  designation: string;
  basicSalary: string;
  absentDays: string;
  absentHours: string;
  overtimeHours: string;
  payPeriod: string;
  bonus: string;
  overtimeRate: string;
  empNo: string;
}

interface PayslipCalculations {
  perDaySalary: number;
  perHourSalary: number;
  absentDaysDeduction: number;
  absentHoursDeduction: number;
  overtimePay: number;
  pf: number;
  esi: number;
  tax: number;
  grossSalary: number;
  totalDeductions: number;
  netSalary: number;
  fuelExpenses: number;
}

const PayslipGenerator = ({
  id,
  month,
  year,
  editable = true,
}: {
  id: string;
  month: string;
  year: string;
  editable?: boolean;
}) => {
  const [employeeData, setEmployeeData] = useState<EmployeeData>({
    employeeName: "",
    department: "",
    designation: "",
    basicSalary: "",
    absentDays: "",
    absentHours: "",
    overtimeHours: "",
    payPeriod: `${year}-${month.toString().padStart(2, "0")}`,
    bonus: "",
    overtimeRate: "1.5",
    empNo: "",
  });

  const [isFirstTime, setIsFirstTime] = useState<boolean>(true);

  const { data, isPending, refetch } = useGetIndividualPayslip({
    employeeId: id,
    month,
    year,
  });

  const startDate = `${year}-${month.toString().padStart(2, "0")}-01`;
  const endDate = new Date(parseInt(year), parseInt(month), 0)
    .toLocaleDateString()
    .split("T")[0];

  const { data: expenses, isPending: isLoadingExpenses } =
    useGetEmployeeExpenses({ employeeId: id, startDate, endDate });

  const {
    mutate: savePayslip,
    isPending: isSaving,
    isSuccess,
  } = useSavePayslip();

  const router = useRouter();

  // Check if payslip is published (you might need to adjust this based on your data structure)
  const isPayslipPublished = () => {
    if (!data || !data.salaries) return false;

    const currentSalary = data.salaries.find(
      (salary: any) =>
        salary.month === Number(month) && salary.year === Number(year)
    );

    // Assuming there's a 'published' field in your salary data
    // Adjust this condition based on your actual data structure
    return currentSalary?.published === true || currentSalary?.publish === true;
  };

  // Calculate total fuel expenses
  const calculateTotalFuelExpenses = (): number => {
    if (!expenses?.expenses || expenses.expenses.length === 0) {
      return 0;
    }

    return expenses.expenses.reduce((total: number, expense: any) => {
      return total + (expense.fuelTotal || 0);
    }, 0);
  };

  // Update employee data when API data is loaded
  useEffect(() => {
    if (data && !isPending) {
      const hasExistingSalaries = data.salaries && data.salaries.length > 0;
      setIsFirstTime(!hasExistingSalaries);

      const currentSalary = data.salaries.find(
        (salary: any) =>
          salary.month === Number(month) && salary.year === Number(year)
      );

      setEmployeeData((prev) => ({
        ...prev,
        employeeName: data.username || "N/A",
        employeeId: data.employeeId || id,
        department: data.storeName || "N/A",
        designation: "Employee",
        basicSalary: currentSalary?.basicSalary?.toString() || "",
        absentDays: currentSalary?.absentDays?.toString() || "",
        absentHours: currentSalary?.absentHours?.toString() || "",
        overtimeHours: currentSalary?.overtimeHours?.toString() || "",
        payPeriod: `${year}-${month.toString().padStart(2, "0")}`,
        bonus: currentSalary?.bonus?.toString() || "",
        overtimeRate: currentSalary?.overtimeRate?.toString() || "1.5",
        empNo: data.empNo,
      }));
    }
  }, [data, isPending, month, year, id]);

  // Calculate derived values
  const calculatePayslip = (): PayslipCalculations => {
    const currentSalary = data?.salaries?.find(
      (salary: any) => salary.month === month && salary.year === year
    );

    const fuelExpenses = calculateTotalFuelExpenses();

    if (currentSalary) {
      return {
        perDaySalary: currentSalary.perDaySalary || 0,
        perHourSalary: currentSalary.perHourSalary || 0,
        absentDaysDeduction: currentSalary.deductionOfDays || 0,
        absentHoursDeduction: currentSalary.deductionOfHours || 0,
        overtimePay: currentSalary.overtimePayable || 0,
        pf: 0,
        esi: 0,
        tax: 0,
        grossSalary: (currentSalary.salaryGT || 0) + fuelExpenses,
        totalDeductions: currentSalary.totalDeductions || 0,
        netSalary: (currentSalary.netSalary || 0) + fuelExpenses,
        fuelExpenses,
      };
    } else {
      const basic = parseFloat(employeeData.basicSalary) || 0;
      const workingDaysPerMonth = 22;
      const workingHoursPerDay = 8;

      const perDaySalary = basic / workingDaysPerMonth;
      const perHourSalary = perDaySalary / workingHoursPerDay;

      const absentDaysDeduction =
        (parseFloat(employeeData.absentDays) || 0) * perDaySalary;
      const absentHoursDeduction =
        (parseFloat(employeeData.absentHours) || 0) * perHourSalary;
      const overtimePay =
        (parseFloat(employeeData.overtimeHours) || 0) *
        perHourSalary *
        (parseFloat(employeeData.overtimeRate) || 1.5);

      const pf = basic * 0.12;
      const esi = basic * 0.0175;
      const tax = basic * 0.1;

      const grossSalary =
        basic +
        overtimePay +
        (parseFloat(employeeData.bonus) || 0) +
        fuelExpenses;
      const totalDeductions =
        absentDaysDeduction + absentHoursDeduction + pf + esi + tax;
      const netSalary = grossSalary - totalDeductions;

      return {
        perDaySalary,
        perHourSalary,
        absentDaysDeduction,
        absentHoursDeduction,
        overtimePay,
        pf,
        esi,
        tax,
        grossSalary,
        totalDeductions,
        netSalary,
        fuelExpenses,
      };
    }
  };

  const calculations = calculatePayslip();

  const handleInputChange = (
    field: keyof EmployeeData,
    value: string
  ): void => {
    setEmployeeData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSavePayslip = (publish: boolean): void => {
    const calculations = calculatePayslip();

    const payload = {
      ...(isFirstTime && {
        employeeId: id,
        month: parseInt(month),
        year: parseInt(year),
      }),
      basicSalary: parseFloat(employeeData.basicSalary) || 0,
      perHourSalary: calculations.perHourSalary,
      overtimeRate: parseFloat(employeeData.overtimeRate) || 1.5,
      bonus: parseFloat(employeeData.bonus) || 0,
      deductionOfHours: calculations.absentHoursDeduction,
      deductionOfDays: calculations.absentDaysDeduction,
      publish: publish,
    };

    savePayslip({ id: data.salaries[0]?.id || id, isFirstTime, payload });

    if (isSuccess) {
      refetch();
    }
  };

  const exportToPDF = (): void => {
    const printContent = document.getElementById("payslip-content");
    if (!printContent) return;

    const originalContent = document.body.innerHTML;
    document.body.innerHTML = printContent.innerHTML;
    window.print();
    document.body.innerHTML = originalContent;
  };

  // Show loading state
  if (isPending || isLoadingExpenses) {
    return <PayslipGeneratorSkeleton />;
  }

  // Show unpublished message when not editable and payslip is not published
  if (!editable && !isPayslipPublished()) {
    return (
      <div
        className="min-h-screen p-3 sm:p-4 md:p-6 text-[var(--foreground)] flex items-center justify-center"
        style={
          {
            "--primary-background": "#b4ca01",
            "--foreground": "#2c2c2c",
            "--secondary-background": "#e4ecaa",
            "--tertiary-background": "#fafcf0",
          } as React.CSSProperties
        }
      >
        <div className="max-w-md mx-auto text-center">
          <div className="bg-white rounded-lg shadow-lg p-8 border">
            <div className="mb-6">
              <MdLock size={64} className="mx-auto text-gray-400 mb-4" />
              <h2 className="text-xl sm:text-2xl font-bold text-gray-700 mb-3">
                Payslip Not Available
              </h2>
              <div className="text-gray-600 space-y-2">
                <p className="text-sm sm:text-base">
                  Your payslip for{" "}
                  <strong>
                    {month}/{year}
                  </strong>{" "}
                  has not been officially published yet.
                </p>
                <p className="text-sm sm:text-base">
                  Please check back later or contact HR for more information.
                </p>
              </div>
            </div>

            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 text-left">
              <div className="flex">
                <div className="ml-3">
                  <p className="text-sm text-yellow-700">
                    <strong>Note:</strong> Payslips are only visible to
                    employees after they have been reviewed and published by the
                    HR department.
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => router.back()}
              className="mt-6 flex items-center justify-center gap-2 w-full px-4 py-3 border border-gray-300 rounded-md bg-white hover:bg-gray-50 transition-colors text-sm font-medium"
            >
              <FaArrowLeft size={16} />
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen p-3 sm:p-4 md:p-6 text-[var(--foreground)]"
      style={
        {
          "--primary-background": "#b4ca01",
          "--foreground": "#2c2c2c",
          "--secondary-background": "#e4ecaa",
          "--tertiary-background": "#fafcf0",
        } as React.CSSProperties
      }
    >
      {editable && (
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 mb-4 px-3 py-2 border border-gray-300 rounded-md bg-white hover:bg-gray-50 transition-colors text-sm"
        >
          <FaArrowLeft size={16} />
          <span className="hidden sm:inline">Back</span>
        </button>
      )}

      <div className="mx-auto max-w-6xl">
        {/* Input Form */}
        {editable && (
          <div className="mb-6 p-3 sm:p-4 md:p-6 bg-white rounded-lg shadow-sm border">
            <h2 className="text-lg sm:text-xl font-semibold mb-4">
              Employee Information
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              <div className="sm:col-span-2 lg:col-span-1">
                <label className="block text-sm font-medium mb-1">
                  Employee Name
                </label>
                <p className="text-sm sm:text-base p-2 bg-gray-50 rounded border min-h-[40px] flex items-center">
                  {employeeData.employeeName || "Loading..."}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Employee ID
                </label>
                <p className="text-sm sm:text-base p-2 bg-gray-50 rounded border min-h-[40px] flex items-center">
                  {employeeData.empNo || "N/A"}
                </p>
              </div>
              <div className="sm:col-span-2 lg:col-span-1">
                <label className="block text-sm font-medium mb-1">
                  Department/Store
                </label>
                <p className="text-sm sm:text-base p-2 bg-gray-50 rounded border min-h-[40px] flex items-center">
                  {employeeData.department || "N/A"}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Basic Salary (₹)
                </label>
                <input
                  type="number"
                  value={employeeData.basicSalary}
                  onChange={(e) =>
                    handleInputChange("basicSalary", e.target.value)
                  }
                  className="w-full p-2 text-sm sm:text-base border rounded-md bg-[var(--tertiary-background)] border-[var(--primary-background)] focus:ring-2 focus:ring-[var(--primary-background)] focus:border-transparent"
                  min="0"
                  step="1000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Pay Period
                </label>
                <input
                  type="month"
                  value={employeeData.payPeriod}
                  className="w-full p-2 text-sm sm:text-base border rounded-md bg-gray-100 border-gray-300 cursor-not-allowed"
                  disabled
                />
                <p className="text-xs text-gray-500 mt-1">
                  Fixed based on selected month/year
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Fuel Expenses (₹)
                </label>
                <div className="w-full p-2 text-sm sm:text-base border rounded-md bg-gray-100 border-gray-300 min-h-[40px] flex items-center">
                  ₹{calculations.fuelExpenses.toFixed(2)}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Auto-calculated from expense records
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Absent Days
                </label>
                <input
                  type="number"
                  value={employeeData.absentDays}
                  onChange={(e) =>
                    handleInputChange("absentDays", e.target.value)
                  }
                  className="w-full p-2 text-sm sm:text-base border rounded-md bg-[var(--tertiary-background)] border-[var(--primary-background)] focus:ring-2 focus:ring-[var(--primary-background)] focus:border-transparent"
                  min="0"
                  step="0.5"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Absent Hours
                </label>
                <input
                  type="number"
                  value={employeeData.absentHours}
                  onChange={(e) =>
                    handleInputChange("absentHours", e.target.value)
                  }
                  className="w-full p-2 text-sm sm:text-base border rounded-md bg-[var(--tertiary-background)] border-[var(--primary-background)] focus:ring-2 focus:ring-[var(--primary-background)] focus:border-transparent"
                  min="0"
                  step="0.5"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Overtime Hours
                </label>
                <input
                  type="number"
                  value={employeeData.overtimeHours}
                  onChange={(e) =>
                    handleInputChange("overtimeHours", e.target.value)
                  }
                  className="w-full p-2 text-sm sm:text-base border rounded-md bg-[var(--tertiary-background)] border-[var(--primary-background)] focus:ring-2 focus:ring-[var(--primary-background)] focus:border-transparent"
                  min="0"
                  step="0.5"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Overtime Rate (multiplier)
                </label>
                <input
                  type="number"
                  value={employeeData.overtimeRate}
                  onChange={(e) =>
                    handleInputChange("overtimeRate", e.target.value)
                  }
                  className="w-full p-2 text-sm sm:text-base border rounded-md bg-[var(--tertiary-background)] border-[var(--primary-background)] focus:ring-2 focus:ring-[var(--primary-background)] focus:border-transparent"
                  min="1"
                  step="0.1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Bonus (₹)
                </label>
                <input
                  type="number"
                  value={employeeData.bonus}
                  onChange={(e) => handleInputChange("bonus", e.target.value)}
                  className="w-full p-2 text-sm sm:text-base border rounded-md bg-[var(--tertiary-background)] border-[var(--primary-background)] focus:ring-2 focus:ring-[var(--primary-background)] focus:border-transparent"
                  min="0"
                  step="100"
                />
              </div>
            </div>
          </div>
        )}

        {/* Export and Save Buttons */}
        {editable && (
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <button
              onClick={() => handleSavePayslip(false)}
              disabled={isSaving}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-md text-white font-medium hover:opacity-90 transition-opacity bg-green-600 disabled:opacity-50 text-sm sm:text-base"
            >
              <FaSave size={18} />
              {isSaving ? "Saving..." : "Save Payslip"}
            </button>
            <button
              onClick={() => handleSavePayslip(true)}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-md text-white font-medium hover:opacity-90 transition-opacity bg-green-600 disabled:opacity-50 text-sm sm:text-base"
            >
              <MdOutlinePublish size={18} />
              {isSaving ? "Publishing..." : "Publish Payslip"}
            </button>
            <button
              onClick={exportToPDF}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-md text-white font-medium hover:opacity-90 transition-opacity bg-[var(--primary-background)] text-sm sm:text-base"
            >
              <FaDownload size={18} />
              Export to PDF
            </button>
          </div>
        )}

        {/* Payslip Display */}
        <div
          id="payslip-content"
          className="p-4 sm:p-6 md:p-8 rounded-lg shadow-lg bg-white text-[var(--foreground)]"
        >
          {/* Company Header */}
          <div className="text-center mb-6">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-2 text-[var(--primary-background)]">
              THE DREAM KITCHENS
            </h1>
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold mb-2 text-[var(--foreground)]">
              PAYSLIP
            </h2>
            <p className="text-xs sm:text-sm">
              Pay Period: {employeeData.payPeriod}
            </p>
          </div>

          {/* Employee Details - Mobile Stack, Desktop Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6">
            <div>
              <h3 className="font-semibold mb-2 pb-1 border-b border-[var(--secondary-background)] text-sm sm:text-base">
                Employee Details
              </h3>
              <div className="space-y-1 text-xs sm:text-sm">
                <p className="break-words">
                  <span className="font-medium">Name:</span>{" "}
                  {employeeData.employeeName || "N/A"}
                </p>
                <p>
                  <span className="font-medium">ID:</span>{" "}
                  {employeeData.empNo || "N/A"}
                </p>
                <p>
                  <span className="font-medium">Store:</span>{" "}
                  {employeeData.department || "N/A"}
                </p>
                <p className="break-all">
                  <span className="font-medium">Email:</span>{" "}
                  {data?.email || "N/A"}
                </p>
              </div>
            </div>
          </div>

          {/* Earnings and Deductions - Stack on Mobile */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Earnings */}
            <div className="order-1">
              <h3 className="font-semibold mb-3 p-2 text-center text-white rounded bg-[var(--primary-background)] text-sm sm:text-base">
                EARNINGS
              </h3>
              <div className="space-y-2 text-xs sm:text-sm">
                <div className="flex justify-between items-start">
                  <span className="flex-1 pr-2">Basic Salary</span>
                  <span className="font-medium">
                    ₹{parseFloat(employeeData.basicSalary || "0").toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="flex-1 pr-2">
                    Overtime Pay ({employeeData.overtimeHours || 0} hrs @{" "}
                    {employeeData.overtimeRate}x)
                  </span>
                  <span className="font-medium">
                    ₹{calculations.overtimePay.toFixed(2)}
                  </span>
                </div>
                {employeeData.bonus && parseFloat(employeeData.bonus) > 0 && (
                  <div className="flex justify-between items-start">
                    <span className="flex-1 pr-2">Bonus</span>
                    <span className="font-medium">
                      ₹{parseFloat(employeeData.bonus).toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-start">
                  <span className="flex-1 pr-2">Fuel Expenses</span>
                  <span className="font-medium">
                    ₹{calculations.fuelExpenses.toFixed(2)}
                  </span>
                </div>
                <div className="border-t pt-2 font-semibold flex justify-between border-[var(--secondary-background)]">
                  <span>Gross Salary</span>
                  <span>₹{calculations.grossSalary.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Deductions */}
            <div className="order-2">
              <h3 className="font-semibold mb-3 p-2 text-center text-white rounded bg-[var(--primary-background)] text-sm sm:text-base">
                DEDUCTIONS
              </h3>
              <div className="space-y-2 text-xs sm:text-sm">
                <div className="flex justify-between items-start">
                  <span className="flex-1 pr-2">
                    Absent Days ({employeeData.absentDays || 0} days)
                  </span>
                  <span className="font-medium">
                    ₹{calculations.absentDaysDeduction.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="flex-1 pr-2">
                    Absent Hours ({employeeData.absentHours || 0} hrs)
                  </span>
                  <span className="font-medium">
                    ₹{calculations.absentHoursDeduction.toFixed(2)}
                  </span>
                </div>
                {calculations.pf > 0 && (
                  <div className="flex justify-between items-start">
                    <span className="flex-1 pr-2">Provident Fund (12%)</span>
                    <span className="font-medium">
                      ₹{calculations.pf.toFixed(2)}
                    </span>
                  </div>
                )}
                {calculations.esi > 0 && (
                  <div className="flex justify-between items-start">
                    <span className="flex-1 pr-2">ESI (1.75%)</span>
                    <span className="font-medium">
                      ₹{calculations.esi.toFixed(2)}
                    </span>
                  </div>
                )}
                {calculations.tax > 0 && (
                  <div className="flex justify-between items-start">
                    <span className="flex-1 pr-2">Tax (10%)</span>
                    <span className="font-medium">
                      ₹{calculations.tax.toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="border-t pt-2 font-semibold flex justify-between border-[var(--secondary-background)]">
                  <span>Total Deductions</span>
                  <span>₹{calculations.totalDeductions.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Net Salary */}
          <div className="mt-6 p-3 sm:p-4 rounded text-center text-white font-bold bg-[var(--primary-background)] text-base sm:text-lg md:text-xl">
            NET SALARY: ₹{calculations.netSalary.toFixed(2)}
          </div>

          {/* Footer */}
          <div className="mt-6 text-center text-xs text-gray-600 space-y-1">
            <p>
              This is a computer-generated payslip and does not require a
              signature.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PayslipGenerator;
