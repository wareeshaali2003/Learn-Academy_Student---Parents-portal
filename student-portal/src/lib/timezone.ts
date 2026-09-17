// utils/timezone.ts

/**
 * Determines a student's timezone based on their Student ID prefix.
 * DXBL / Dxbls... => Dubai (UTC+4)
 * Everything else (PKLS, LAOX, etc.) => Pakistan (UTC+5), the default storage timezone.
 */
export const getStudentTimezone = (studentId?: string | null): string => {
  if (!studentId) return "Asia/Karachi";

  const id = studentId.toUpperCase();

  if (id.startsWith("DXBL")) {
    return "Asia/Dubai"; // UTC+4
  }

  return "Asia/Karachi"; // UTC+5 (default / all other prefixes)
};

export const isDubaiTimezone = (studentId?: string | null): boolean =>
  getStudentTimezone(studentId) === "Asia/Dubai";

/**
 * Converts a "HH:MM:SS" time string stored in PKT (Asia/Karachi, UTC+5)
 * into the equivalent local time for the given student.
 * PKT -> Dubai is a fixed -1 hour offset (no DST in either country).
 */
export const convertTimeForStudent = (
  time: string | undefined | null,
  studentId?: string | null
): string => {
  if (!time) return "";

  const timezone = getStudentTimezone(studentId);

  if (timezone === "Asia/Karachi") {
    return time; // already stored in PKT, no conversion needed
  }

  // Asia/Dubai case: subtract 1 hour, handling day rollunder safely
  const [hoursStr, minutesStr, secondsStr] = time.split(":");
  let hours = parseInt(hoursStr, 10) - 1;
  const minutes = parseInt(minutesStr || "0", 10);
  const seconds = parseInt(secondsStr || "0", 10);

  if (hours < 0) {
    hours += 24; // wraps to previous day's clock time (date label itself is unaffected)
  }

  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
};

/**
 * Short label to show next to converted times, e.g. "(Dubai time)".
 * Returns an empty string for Pakistan students so nothing extra is rendered.
 */
export const getTimezoneLabel = (studentId?: string | null): string => {
  return isDubaiTimezone(studentId) ? "(Dubai time)" : "";
};