import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { EmployeeExpenses } from "@/types/hrDashboard.types";

export const exportToExcelAttendance = (
  data: any[],
  fileName: string,
  viewMode: string,
  dateRange: { startDate: string; endDate: string }
) => {
  if (!data || data.length === 0) return;

  // Prepare heading and date info
  const heading = [["Employees Attendance"]];
  const dateInfo = [
    [`Date Range: ${dateRange.startDate} - ${dateRange.endDate}`],
  ];
  const blank = [[""]];

  // Define headers
  const headers =
    viewMode === "day"
      ? [["Employee", "Email", "Store", "Status"]]
      : [
          [
            "Employee",
            "Email",
            "Store",
            "Present",
            "Absent",
            "Late",
            "Early Exit",
            "Total Days",
          ],
        ];

  // Prepare rows
  const rows = data.map((employee) =>
    viewMode === "day"
      ? [
          employee.username,
          employee.email,
          employee.storeName,
          employee.relevantAttendance?.length > 0
            ? employee.relevantAttendance[0].status
                .replace("_", " ")
                .toUpperCase()
            : "No data",
        ]
      : [
          employee.username,
          employee.email,
          employee.storeName,
          employee.summary.present,
          employee.summary.absent,
          employee.summary.late,
          employee.summary.earlyExit,
          employee.summary.total,
        ]
  );

  // Combine all parts into one array for Excel
  const worksheetData = [
    ...heading,
    ...dateInfo,
    ...blank,
    ...headers,
    ...rows,
  ];

  // Create worksheet and workbook
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Employees");

  // Auto width for columns
  const colWidths = headers[0].map((_, i) => ({
    wch: Math.max(10, ...rows.map((r) => (r[i] ? r[i].toString().length : 10))),
  }));
  worksheet["!cols"] = colWidths;

  // Save as .xlsx
  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const blob = new Blob([excelBuffer], {
    type: "application/octet-stream",
  });
  saveAs(blob, `${fileName}.xlsx`);
};

export const exportToPDFAttendance = (
  data: any[],
  fileName: string,
  viewMode: string,
  dateRange: { startDate: string; endDate: string }
) => {
  if (!data || data.length === 0) return;

  const doc = new jsPDF();

  // Title
  doc.setFontSize(14);
  doc.text("Employees Attendance", 14, 15);

  // Date Range
  doc.setFontSize(10);
  doc.text(`Date Range: ${dateRange.startDate} - ${dateRange.endDate}`, 14, 22);

  // Define table headers based on viewMode
  const head =
    viewMode === "day"
      ? [["Employee", "Email", "Store", "Status"]]
      : [
          [
            "Employee",
            "Email",
            "Store",
            "Present",
            "Absent",
            "Late",
            "Early Exit",
            "Total Days",
          ],
        ];

  // Map data into rows
  const body = data.map((employee) =>
    viewMode === "day"
      ? [
          employee.username,
          employee.email,
          employee.storeName,
          employee.relevantAttendance?.length > 0
            ? employee.relevantAttendance[0].status
                .replace("_", " ")
                .toUpperCase()
            : "No data",
        ]
      : [
          employee.username,
          employee.email,
          employee.storeName,
          employee.summary.present,
          employee.summary.absent,
          employee.summary.late,
          employee.summary.earlyExit,
          employee.summary.total,
        ]
  );

  // Generate table
  autoTable(doc, {
    head,
    body,
    startY: 28,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [50, 50, 50] },
  });

  doc.save(`${fileName}.pdf`);
};

const getDateRangeText = (viewType: "day" | "month", selectedDate: string) => {
  if (viewType === "day") return selectedDate;
  const yearMonth = selectedDate.substring(0, 7);
  const start = new Date(yearMonth + "-01");
  const end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
  return `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
};

// ✅ Safely parse numbers
const toNum = (value: any): number =>
  isNaN(Number(value)) ? 0 : Number(value);

// ✅ Export to PDF
export const exportToPDF = (
  data: EmployeeExpenses[],
  viewType: "day" | "month",
  selectedDate: string
) => {
  const doc = new jsPDF();
  const title = "Employee Expense Records";
  const dateRange = getDateRangeText(viewType, selectedDate);

  doc.setFontSize(16);
  doc.text(title, 14, 15);
  doc.setFontSize(12);
  doc.text(`Date: ${dateRange}`, 14, 22);

  const columns = ["Employee Name", "Email", "Store"];
  if (viewType === "day") {
    columns.push(
      "Initial Reading",
      "Final Reading",
      "Total Usage (KM)",
      "Rate"
    );
  }
  columns.push("Amount", "Miscellaneous", "Final Amount");

  const rows = data.map((emp) => {
    const initial = toNum(emp.initialReading);
    const final = toNum(emp.finalReading);
    const rate = toNum(emp.rate);
    const misc = toNum(emp.miscellaneousExpense);

    const totalUsage = final - initial;
    const totalAmount = rate * totalUsage;
    const finalAmount = totalAmount + misc;

    const row: any[] = [emp.employeeName, emp.email, emp.storeName];
    if (viewType === "day") {
      row.push(initial, final, totalUsage, rate);
    }
    row.push(totalAmount.toFixed(2), misc.toFixed(2), finalAmount.toFixed(2));
    return row;
  });

  autoTable(doc, {
    startY: 30,
    head: [columns],
    body: rows,
    styles: { fontSize: 10 },
    headStyles: { fillColor: [180, 202, 1] },
  });

  doc.save(`Employee_Expenses_${selectedDate}.pdf`);
};

// ✅ Export to Excel
export const exportToExcelExpenses = (
  data: EmployeeExpenses[],
  viewType: "day" | "month",
  selectedDate: string
) => {
  const dateRange = getDateRangeText(viewType, selectedDate);

  const worksheetData = data.map((emp) => {
    const initial = toNum(emp.initialReading);
    const final = toNum(emp.finalReading);
    const rate = toNum(emp.rate);
    const misc = toNum(emp.miscellaneousExpense);

    const totalUsage = final - initial;
    const totalAmount = rate * totalUsage;
    const finalAmount = totalAmount + misc;

    const row: any = {
      "Employee Name": emp.employeeName,
      Email: emp.email,
      Store: emp.storeName,
    };

    if (viewType === "day") {
      row["Initial Reading"] = initial;
      row["Final Reading"] = final;
      row["Total Usage (KM)"] = totalUsage;
      row["Rate"] = rate;
    }

    row["Amount"] = totalAmount.toFixed(2);
    row["Miscellaneous"] = misc.toFixed(2);
    row["Final Amount"] = finalAmount.toFixed(2);

    return row;
  });

  const worksheet = XLSX.utils.json_to_sheet(worksheetData);
  const workbook = XLSX.utils.book_new();

  XLSX.utils.sheet_add_aoa(worksheet, [["Employee Expense Records"]], {
    origin: "A1",
  });
  XLSX.utils.sheet_add_aoa(worksheet, [[`Date: ${dateRange}`]], {
    origin: "A2",
  });

  XLSX.utils.book_append_sheet(workbook, worksheet, "Expenses");
  XLSX.writeFile(workbook, `Employee_Expenses_${selectedDate}.xlsx`);
};

export const exportToPDFExpenses = (
  data: EmployeeExpenses[],
  viewType: "day" | "month",
  selectedDate: string
) => {
  const doc = new jsPDF();
  const title = "Employee Expense Records";
  const dateRange = getDateRangeText(viewType, selectedDate);

  // Title
  doc.setFontSize(16);
  doc.text(title, 14, 15);
  doc.setFontSize(12);
  doc.text(`Date: ${dateRange}`, 14, 22);

  // Table columns
  const columns = ["Employee Name", "Email", "Store"];

  if (viewType === "day") {
    columns.push(
      "Initial Reading",
      "Final Reading",
      "Total Usage (KM)",
      "Rate"
    );
  }

  columns.push("Amount", "Miscellaneous", "Final Amount");

  // Table rows
  const rows = data.map((emp) => {
    const totalUsage = Number(emp.finalReading) - Number(emp.initialReading);
    const totalAmount = Number(emp.rate) * totalUsage;

    const finalAmount = totalAmount + emp.miscellaneousExpense;

    const row: any[] = [emp.employeeName, emp.email, emp.storeName];
    if (viewType === "day") {
      row.push(emp.initialReading, emp.finalReading, totalUsage, emp.rate);
    }
    row.push(
      totalAmount.toFixed(2),
      emp.miscellaneousExpense.toFixed(2),
      finalAmount.toFixed(2)
    );
    return row;
  });

  autoTable(doc, {
    startY: 30,
    head: [columns],
    body: rows,
    styles: { fontSize: 10 },
    headStyles: { fillColor: [180, 202, 1] },
  });

  doc.save(`Employee_Expenses_${selectedDate}.pdf`);
};
