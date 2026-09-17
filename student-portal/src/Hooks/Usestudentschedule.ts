import { useState, useEffect, useCallback } from "react";
import { erpService, CourseScheduleEntry } from "../services/erpService";

export type ViewMode = "week" | "month" | "list";

export interface ScheduleState {
  schedules: CourseScheduleEntry[];
  loading: boolean;
  error: string | null;
  weekOffset: number;
  viewMode: ViewMode;
  selectedDate: Date;
}

const useStudentSchedule = (studentId: string | undefined) => {
  const [schedules, setSchedules] = useState<CourseScheduleEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [selectedDate, setSelectedDate] = useState(new Date());

  // ── Fetch schedules based on viewMode ─────────────────────────────────────
  const fetchSchedules = useCallback(async () => {
    if (!studentId) return;

    setLoading(true);
    setError(null);

    try {
      let data: CourseScheduleEntry[] = [];

      if (viewMode === "week") {
        data = await erpService.getWeeklySchedule(studentId, weekOffset);
      } else if (viewMode === "month") {
        // Monthly range: first to last day of selected month
        const year = selectedDate.getFullYear();
        const month = selectedDate.getMonth();
        const startDate = new Date(year, month, 1).toISOString().split("T")[0];
        const endDate = new Date(year, month + 1, 0).toISOString().split("T")[0];
        data = await erpService.getScheduleRange(studentId, startDate, endDate);
      } else {
        // List view: next 30 days
        const today = new Date();
        const future = new Date();
        future.setDate(today.getDate() + 30);
        const startDate = today.toISOString().split("T")[0];
        const endDate = future.toISOString().split("T")[0];
        data = await erpService.getScheduleRange(studentId, startDate, endDate);
      }

      setSchedules(data);
    } catch (err: any) {
      setError(err?.message || "Failed to load schedule");
      console.error("[useStudentSchedule] error:", err);
    } finally {
      setLoading(false);
    }
  }, [studentId, weekOffset, viewMode, selectedDate]);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  // ── Navigation helpers ─────────────────────────────────────────────────────
  const goToPrevious = () => {
    if (viewMode === "week") {
      setWeekOffset((prev) => prev - 1);
    } else if (viewMode === "month") {
      setSelectedDate((prev) => {
        const d = new Date(prev);
        d.setMonth(d.getMonth() - 1);
        return d;
      });
    }
  };

  const goToNext = () => {
    if (viewMode === "week") {
      setWeekOffset((prev) => prev + 1);
    } else if (viewMode === "month") {
      setSelectedDate((prev) => {
        const d = new Date(prev);
        d.setMonth(d.getMonth() + 1);
        return d;
      });
    }
  };

  const goToToday = () => {
    setWeekOffset(0);
    setSelectedDate(new Date());
  };

  // ── Computed: week date range label ───────────────────────────────────────
  const getWeekLabel = (): string => {
    const today = new Date();
    const dow = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1) + weekOffset * 7);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const fmt = (d: Date) =>
      d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

    return `${fmt(monday)} – ${fmt(sunday)}`;
  };

  // ── Computed: group schedules by date ─────────────────────────────────────
  const groupedByDate = schedules.reduce<Record<string, CourseScheduleEntry[]>>(
    (acc, entry) => {
      const key = entry.schedule_date;
      if (!acc[key]) acc[key] = [];
      acc[key].push(entry);
      return acc;
    },
    {}
  );

  // ── Computed: today's schedule only ───────────────────────────────────────
  const todayStr = new Date().toISOString().split("T")[0];
  const todaySchedule = schedules.filter((s) => s.schedule_date === todayStr);

  // ── Computed: unique courses in current view ───────────────────────────────
  const uniqueCourses = [...new Set(schedules.map((s) => s.course))];

  return {
    // Data
    schedules,
    groupedByDate,
    todaySchedule,
    uniqueCourses,

    // State
    loading,
    error,
    weekOffset,
    viewMode,
    selectedDate,

    // Actions
    setViewMode,
    goToPrevious,
    goToNext,
    goToToday,
    refetch: fetchSchedules,

    // Helpers
    getWeekLabel,
  };
};

export default useStudentSchedule;