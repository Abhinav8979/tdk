export function getCurrentYear(): number {
  return new Date().getFullYear();
}

export function calculateDays(start: string, end: string): number {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const timeDiff = endDate.getTime() - startDate.getTime();
  return Math.floor(timeDiff / (1000 * 60 * 60 * 24)) + 1; // Inclusive
}

export const formatTime = (isoString: string | null): string => {
  if (!isoString) return "—";
  const date = new Date(isoString);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

export const formatDate = (
  dateString: string | null | undefined | Date
): string => {
  if (!dateString) return "N/A";
  const options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "long",
    day: "numeric",
  };
  return new Date(dateString).toLocaleDateString(undefined, options);
};

export const formatHours = (hours: number): string => {
  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);
  return `${wholeHours}h ${minutes}m`;
};

export const calculateTenure = (
  dateString: string | null | undefined
): string => {
  if (!dateString) return "N/A";
  const joinDate = new Date(dateString);
  const today = new Date();
  const diffTime = Math.abs(today.getTime() - joinDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 30) return `${diffDays} days`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months`;
  return `${Math.floor(diffDays / 365)} years, ${Math.floor(
    (diffDays % 365) / 30
  )} months`;
};

interface AttendanceEntry {
  date: string;
  status: string;
  inTime: string;
  outTime: string;
  isLateEntry: boolean;
  isEarlyExit: boolean;
}

interface EmployeeAttendance {
  employeeId: string | number;
  attendance: AttendanceEntry[];
}

export const calculateWorkingHours = (
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

export function isToday(dateStr: string): boolean {
  const inputDate = new Date(dateStr);
  const today = new Date();

  return (
    inputDate.getFullYear() === today.getFullYear() &&
    inputDate.getMonth() === today.getMonth() &&
    inputDate.getDate() === today.getDate()
  );
}

export const getChangedFields = (original: any, current: any): any => {
  const changes: any = {};

  // Deep comparison function
  const isEqual = (a: any, b: any): boolean => {
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (typeof a !== typeof b) return false;

    if (typeof a === "object") {
      if (Array.isArray(a) !== Array.isArray(b)) return false;

      if (Array.isArray(a)) {
        if (a.length !== b.length) return false;
        return a.every((item, index) => isEqual(item, b[index]));
      }

      const keysA = Object.keys(a);
      const keysB = Object.keys(b);
      if (keysA.length !== keysB.length) return false;

      return keysA.every(
        (key) => keysB.includes(key) && isEqual(a[key], b[key])
      );
    }

    return false;
  };

  Object.keys(current).forEach((key) => {
    if (!isEqual(original[key], current[key])) {
      changes[key] = current[key];
    }
  });

  return changes;
};

export const generateQRCode = (
  text: string,
  canvas: HTMLCanvasElement
): string => {
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  // Simple QR code-like pattern generator (for demo purposes)
  const size: number = 200;
  const modules: number = 25;
  const moduleSize: number = size / modules;

  canvas.width = size;
  canvas.height = size;

  // Clear canvas
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, size, size);

  // Generate a simple pattern based on the text
  ctx.fillStyle = "#000000";

  // Create a pseudo-random pattern based on the text
  const hash: number = text.split("").reduce((a: number, b: string) => {
    a = (a << 5) - a + b.charCodeAt(0);
    return a & a;
  }, 0);

  for (let i = 0; i < modules; i++) {
    for (let j = 0; j < modules; j++) {
      const seed: number = hash + i * modules + j;
      if (Math.abs(seed) % 3 === 0) {
        ctx.fillRect(i * moduleSize, j * moduleSize, moduleSize, moduleSize);
      }
    }
  }

  // Add corner squares (QR code markers)
  const markerSize: number = moduleSize * 7;
  // Top-left
  ctx.fillRect(0, 0, markerSize, markerSize);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(
    moduleSize,
    moduleSize,
    markerSize - 2 * moduleSize,
    markerSize - 2 * moduleSize
  );
  ctx.fillStyle = "#000000";
  ctx.fillRect(
    moduleSize * 2,
    moduleSize * 2,
    markerSize - 4 * moduleSize,
    markerSize - 4 * moduleSize
  );

  // Top-right
  ctx.fillStyle = "#000000";
  ctx.fillRect(size - markerSize, 0, markerSize, markerSize);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(
    size - markerSize + moduleSize,
    moduleSize,
    markerSize - 2 * moduleSize,
    markerSize - 2 * moduleSize
  );
  ctx.fillStyle = "#000000";
  ctx.fillRect(
    size - markerSize + moduleSize * 2,
    moduleSize * 2,
    markerSize - 4 * moduleSize,
    markerSize - 4 * moduleSize
  );

  // Bottom-left
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, size - markerSize, markerSize, markerSize);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(
    moduleSize,
    size - markerSize + moduleSize,
    markerSize - 2 * moduleSize,
    markerSize - 2 * moduleSize
  );
  ctx.fillStyle = "#000000";
  ctx.fillRect(
    moduleSize * 2,
    size - markerSize + moduleSize * 2,
    markerSize - 4 * moduleSize,
    markerSize - 4 * moduleSize
  );

  return canvas.toDataURL();
};
