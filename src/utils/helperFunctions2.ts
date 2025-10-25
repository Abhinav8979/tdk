import * as XLSX from "xlsx";

// Alternative PDF export using browser's print functionality
// This approach works without external PDF libraries

// Define TypeScript interfaces
interface AttendanceRecord {
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

interface GroupedAttendanceData {
  employeeId: string;
  employeeName: string;
  department: string;
  totalDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  earlyExitDays: number;
  totalHours: number;
}

// Helper function to format time from ISO string
const formatTime = (isoString: string | null): string => {
  if (!isoString) return "—";
  const date = new Date(isoString);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

// Helper function to calculate working hours
const calculateWorkingHours = (
  inTime: string | null,
  outTime: string | null
): string => {
  if (!inTime || !outTime) return "N/A";

  const start = new Date(inTime);
  const end = new Date(outTime);
  const diffMs = end.getTime() - start.getTime();
  const diffHrs = Math.floor(diffMs / 3600000);
  const diffMins = Math.floor((diffMs % 3600000) / 60000);

  return `${diffHrs}h ${diffMins}m`;
};

// Helper function to format hours number
const formatHours = (hours: number): string => {
  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);
  return `${wholeHours}h ${minutes}m`;
};

// Helper function to get remarks
const getRemarks = (employee: AttendanceRecord): string => {
  if (employee.isLateEntry && employee.isEarlyExit) {
    return "Late Entry & Early Exit";
  } else if (employee.isLateEntry) {
    return "Late Entry";
  } else if (employee.isEarlyExit) {
    return "Early Exit";
  }
  return "";
};

/**
 * Export daily attendance data to Excel
 */
export const exportDailyAttendanceToExcel = (
  attendanceData: AttendanceRecord[],
  selectedDate: Date,
  fileName?: string
): void => {
  try {
    // Prepare data for Excel
    const excelData = attendanceData.map((employee) => ({
      "Employee ID": employee.employeeId,
      "Employee Name": employee.employeeName,
      Department: employee.department,
      Date: employee.date,
      Status: employee.status.toUpperCase(),
      "In Time": formatTime(employee.inTime),
      "Out Time": formatTime(employee.outTime),
      Duration: calculateWorkingHours(employee.inTime, employee.outTime),
      "Late Entry": employee.isLateEntry ? "Yes" : "No",
      "Early Exit": employee.isEarlyExit ? "Yes" : "No",
      Remarks: getRemarks(employee),
    }));

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // Set column widths
    const colWidths = [
      { wch: 12 }, // Employee ID
      { wch: 20 }, // Employee Name
      { wch: 15 }, // Department
      { wch: 12 }, // Date
      { wch: 10 }, // Status
      { wch: 10 }, // In Time
      { wch: 10 }, // Out Time
      { wch: 12 }, // Duration
      { wch: 12 }, // Late Entry
      { wch: 12 }, // Early Exit
      { wch: 25 }, // Remarks
    ];
    worksheet["!cols"] = colWidths;

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, "Daily Attendance");

    // Generate filename
    const dateStr = selectedDate.toISOString().split("T")[0];
    const defaultFileName = `Daily_Attendance_${dateStr}.xlsx`;

    // Write and download file
    XLSX.writeFile(workbook, fileName || defaultFileName);

    console.log("Daily attendance exported to Excel successfully");
  } catch (error) {
    console.error("Error exporting daily attendance to Excel:", error);
    alert("Failed to export attendance data. Please try again.");
  }
};

/**
 * Export grouped attendance data (Week/Month) to Excel
 */
export const exportGroupedAttendanceToExcel = (
  groupedData: GroupedAttendanceData[],
  viewMode: "Week" | "Month",
  dateRange: { start: Date; end: Date },
  fileName?: string
): void => {
  try {
    // Prepare data for Excel
    const excelData = groupedData.map((employee) => ({
      "Employee ID": employee.employeeId,
      "Employee Name": employee.employeeName,
      Department: employee.department,
      "Total Days": employee.totalDays,
      "Present Days": employee.presentDays,
      "Absent Days": employee.absentDays,
      "Late Days": employee.lateDays,
      "Early Exit Days": employee.earlyExitDays,
      "Total Hours": formatHours(employee.totalHours),
      "Attendance %":
        employee.totalDays > 0
          ? `${Math.round((employee.presentDays / employee.totalDays) * 100)}%`
          : "0%",
    }));

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // Set column widths
    const colWidths = [
      { wch: 12 }, // Employee ID
      { wch: 20 }, // Employee Name
      { wch: 15 }, // Department
      { wch: 12 }, // Total Days
      { wch: 12 }, // Present Days
      { wch: 12 }, // Absent Days
      { wch: 12 }, // Late Days
      { wch: 15 }, // Early Exit Days
      { wch: 15 }, // Total Hours
      { wch: 15 }, // Attendance %
    ];
    worksheet["!cols"] = colWidths;

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, `${viewMode} Summary`);

    // Generate filename
    const startDate = dateRange.start.toISOString().split("T")[0];
    const endDate = dateRange.end.toISOString().split("T")[0];
    const defaultFileName = `${viewMode}_Attendance_Summary_${startDate}_to_${endDate}.xlsx`;

    // Write and download file
    XLSX.writeFile(workbook, fileName || defaultFileName);

    console.log(
      `${viewMode} attendance summary exported to Excel successfully`
    );
  } catch (error) {
    console.error(`Error exporting ${viewMode} attendance to Excel:`, error);
    alert("Failed to export attendance data. Please try again.");
  }
};

/**
 * Export daily attendance data to PDF using browser print
 */
export const exportDailyAttendanceToPDF = (
  attendanceData: AttendanceRecord[],
  selectedDate: Date,
  fileName?: string
): void => {
  try {
    // Create HTML content for PDF
    const dateStr = selectedDate.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "long",
    });

    const presentCount = attendanceData.filter(
      (emp) => emp.status === "present"
    ).length;
    const absentCount = attendanceData.filter(
      (emp) => emp.status === "absent"
    ).length;
    const totalCount = attendanceData.length;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Daily Attendance Report - ${dateStr}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 20px; 
              color: #2c2c2c;
            }
            .header { 
              text-align: center; 
              margin-bottom: 30px; 
              border-bottom: 2px solid #b4ca01;
              padding-bottom: 20px;
            }
            .header h1 { 
              color: #2c2c2c; 
              margin: 0 0 10px 0;
              font-size: 24px;
            }
            .header h2 { 
              color: #666; 
              margin: 5px 0;
              font-size: 16px;
              font-weight: normal;
            }
            .summary { 
              background-color: #fafcf0; 
              padding: 15px; 
              border-radius: 5px; 
              margin-bottom: 20px;
              display: flex;
              justify-content: space-around;
              text-align: center;
            }
            .summary-item {
              flex: 1;
            }
            .summary-item .number {
              font-size: 24px;
              font-weight: bold;
              color: #b4ca01;
            }
            .summary-item .label {
              font-size: 12px;
              color: #666;
              text-transform: uppercase;
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-top: 20px;
              background: white;
            }
            th { 
              background-color: #b4ca01; 
              color: #2c2c2c; 
              padding: 12px 8px; 
              text-align: left;
              font-weight: bold;
              font-size: 12px;
              text-transform: uppercase;
            }
            td { 
              padding: 10px 8px; 
              border-bottom: 1px solid #e5e5e5;
              font-size: 11px;
            }
            tr:nth-child(even) { 
              background-color: #fafcf0; 
            }
            .status-present { 
              background-color: #dcfce7; 
              color: #166534; 
              padding: 4px 8px; 
              border-radius: 12px; 
              font-size: 10px;
              font-weight: bold;
            }
            .status-absent { 
              background-color: #fecaca; 
              color: #991b1b; 
              padding: 4px 8px; 
              border-radius: 12px; 
              font-size: 10px;
              font-weight: bold;
            }
            .indicator {
              display: inline-block;
              width: 8px;
              height: 8px;
              border-radius: 50%;
              margin-right: 5px;
            }
            .late { background-color: #fbbf24; }
            .early-exit { background-color: #f97316; }
            .footer {
              margin-top: 30px;
              text-align: center;
              font-size: 10px;
              color: #666;
              border-top: 1px solid #e5e5e5;
              padding-top: 15px;
            }
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Daily Attendance Report</h1>
            <h2>${dateStr}</h2>
          </div>
          
          <div class="summary">
            <div class="summary-item">
              <div class="number">${totalCount}</div>
              <div class="label">Total Employees</div>
            </div>
            <div class="summary-item">
              <div class="number">${presentCount}</div>
              <div class="label">Present</div>
            </div>
            <div class="summary-item">
              <div class="number">${absentCount}</div>
              <div class="label">Absent</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Employee ID</th>
                <th>Employee Name</th>
                <th>Department</th>
                <th>Status</th>
                <th>In Time</th>
                <th>Out Time</th>
                <th>Duration</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              ${attendanceData
                .map(
                  (employee) => `
                <tr>
                  <td>${employee.employeeId}</td>
                  <td><strong>${employee.employeeName}</strong></td>
                  <td>${employee.department}</td>
                  <td>
                    <span class="status-${employee.status}">
                      ${employee.status.toUpperCase()}
                    </span>
                  </td>
                  <td>
                    ${
                      employee.isLateEntry
                        ? '<span class="indicator late"></span>'
                        : ""
                    }
                    ${formatTime(employee.inTime)}
                  </td>
                  <td>
                    ${
                      employee.isEarlyExit
                        ? '<span class="indicator early-exit"></span>'
                        : ""
                    }
                    ${formatTime(employee.outTime)}
                  </td>
                  <td>${calculateWorkingHours(
                    employee.inTime,
                    employee.outTime
                  )}</td>
                  <td>${getRemarks(employee)}</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>

          <div class="footer">
            Generated on ${new Date().toLocaleString()} | Company Attendance System
          </div>
        </body>
      </html>
    `;

    // Open new window and print
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();

      // Wait for content to load then print
      printWindow.onload = () => {
        printWindow.print();
        // Close window after printing (optional)
        printWindow.onafterprint = () => {
          printWindow.close();
        };
      };
    } else {
      alert("Please allow popups to export PDF");
    }

    console.log("Daily attendance prepared for PDF export");
  } catch (error) {
    console.error("Error preparing daily attendance for PDF:", error);
    alert("Failed to prepare PDF export. Please try again.");
  }
};

/**
 * Export grouped attendance data (Week/Month) to PDF using browser print
 */
export const exportGroupedAttendanceToPDF = (
  groupedData: GroupedAttendanceData[],
  viewMode: "Week" | "Month",
  dateRange: { start: Date; end: Date },
  fileName?: string
): void => {
  try {
    const startDate = dateRange.start.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    const endDate = dateRange.end.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

    const totalEmployees = groupedData.length;
    const employeesWithPresence = groupedData.filter(
      (emp) => emp.presentDays > 0
    ).length;
    const employeesWithAbsence = groupedData.filter(
      (emp) => emp.absentDays > 0
    ).length;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${viewMode}ly Attendance Summary - ${startDate} to ${endDate}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 20px; 
              color: #2c2c2c;
            }
            .header { 
              text-align: center; 
              margin-bottom: 30px; 
              border-bottom: 2px solid #b4ca01;
              padding-bottom: 20px;
            }
            .header h1 { 
              color: #2c2c2c; 
              margin: 0 0 10px 0;
              font-size: 24px;
            }
            .header h2 { 
              color: #666; 
              margin: 5px 0;
              font-size: 16px;
              font-weight: normal;
            }
            .summary { 
              background-color: #fafcf0; 
              padding: 15px; 
              border-radius: 5px; 
              margin-bottom: 20px;
              display: flex;
              justify-content: space-around;
              text-align: center;
            }
            .summary-item {
              flex: 1;
            }
            .summary-item .number {
              font-size: 24px;
              font-weight: bold;
              color: #b4ca01;
            }
            .summary-item .label {
              font-size: 12px;
              color: #666;
              text-transform: uppercase;
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-top: 20px;
              background: white;
            }
            th { 
              background-color: #b4ca01; 
              color: #2c2c2c; 
              padding: 12px 8px; 
              text-align: left;
              font-weight: bold;
              font-size: 12px;
              text-transform: uppercase;
            }
            td { 
              padding: 10px 8px; 
              border-bottom: 1px solid #e5e5e5;
              font-size: 11px;
              text-align: center;
            }
            td:first-child, td:nth-child(2), td:nth-child(3) {
              text-align: left;
            }
            tr:nth-child(even) { 
              background-color: #fafcf0; 
            }
            .footer {
              margin-top: 30px;
              text-align: center;
              font-size: 10px;
              color: #666;
              border-top: 1px solid #e5e5e5;
              padding-top: 15px;
            }
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${viewMode}ly Attendance Summary</h1>
            <h2>Period: ${startDate} - ${endDate}</h2>
          </div>
          
          <div class="summary">
            <div class="summary-item">
              <div class="number">${totalEmployees}</div>
              <div class="label">Total Employees</div>
            </div>
            <div class="summary-item">
              <div class="number">${employeesWithPresence}</div>
              <div class="label">With Attendance</div>
            </div>
            <div class="summary-item">
              <div class="number">${employeesWithAbsence}</div>
              <div class="label">With Absences</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Employee ID</th>
                <th>Employee Name</th>
                <th>Department</th>
                <th>Present Days</th>
                <th>Absent Days</th>
                <th>Late Days</th>
                <th>Early Exit</th>
                <th>Total Hours</th>
                <th>Attendance %</th>
              </tr>
            </thead>
            <tbody>
              ${groupedData
                .map(
                  (employee) => `
                <tr>
                  <td style="text-align: left">${employee.employeeId}</td>
                  <td style="text-align: left"><strong>${
                    employee.employeeName
                  }</strong></td>
                  <td style="text-align: left">${employee.department}</td>
                  <td>${employee.presentDays}</td>
                  <td>${employee.absentDays}</td>
                  <td>${employee.lateDays}</td>
                  <td>${employee.earlyExitDays}</td>
                  <td>${formatHours(employee.totalHours)}</td>
                  <td><strong>${
                    employee.totalDays > 0
                      ? `${Math.round(
                          (employee.presentDays / employee.totalDays) * 100
                        )}%`
                      : "0%"
                  }</strong></td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>

          <div class="footer">
            Generated on ${new Date().toLocaleString()} | Company Attendance System
          </div>
        </body>
      </html>
    `;

    // Open new window and print
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();

      // Wait for content to load then print
      printWindow.onload = () => {
        printWindow.print();
        // Close window after printing (optional)
        printWindow.onafterprint = () => {
          printWindow.close();
        };
      };
    } else {
      alert("Please allow popups to export PDF");
    }

    console.log(`${viewMode} attendance summary prepared for PDF export`);
  } catch (error) {
    console.error(`Error preparing ${viewMode} attendance for PDF:`, error);
    alert("Failed to prepare PDF export. Please try again.");
  }
};

export const printAttendanceReport = (): void => {
  window.print();
};
