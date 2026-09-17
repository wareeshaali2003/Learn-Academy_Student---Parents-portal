// hooks/Useschedule.ts
import { useState, useEffect, useCallback } from 'react';
import { apiClient, erpService, CourseScheduleEntry } from '../services/erpService';
import { useUser } from '../context/UserContext';
import { convertTimeForStudent, getTimezoneLabel } from '../lib/timezone';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ScheduleEntry {
  student_group_name: string;
  course: string;
  schedule_date: string;        // "YYYY-MM-DD"
  from_time: string;            // "HH:MM:SS" — original, always PKT as stored
  to_time: string;              // "HH:MM:SS" — original, always PKT as stored
  title: string;
  custom_meeting_link: string | null;
  student: string;
  room: string;

  // Timezone display values
  display_from_time: string;
  display_to_time: string;
  timezone_label: string;
}

export type ViewMode = 'week' | 'list';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

export function stripSchoolPrefix(raw: string): string {
  return raw.replace(/^[A-Z]{1,5}-/, '');
}

export function formatTime(timeStr: string): string {
  const [hRaw, m] = timeStr.split(':');
  const h = parseInt(hRaw, 10);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${m} ${period}`;
}

export function getWeekDates(weekOffset = 0): { start: Date; end: Date } {
  const today = new Date();
  const dow   = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1) + weekOffset * 7);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { start: monday, end: sunday };
}

export function fmtDate(d: Date): string {
  const y  = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const da = String(d.getDate()).padStart(2, '0');
  return `${y}-${mo}-${da}`;
}

export function dayLabel(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-PK', {
    weekday: 'long',
    month:   'short',
    day:     'numeric',
  });
}

// Attaches timezone-converted display times to each raw entry
function withDisplayTimes(raw: any[]): ScheduleEntry[] {
  return raw.map((e) => ({
    ...e,
    display_from_time: convertTimeForStudent(e.from_time, e.student),
    display_to_time: convertTimeForStudent(e.to_time, e.student),
    timezone_label: getTimezoneLabel(e.student),
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Course colour palette
// ─────────────────────────────────────────────────────────────────────────────

const PALETTE = [
  { bg: 'bg-emerald-50',  border: 'border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-400',  badge: 'bg-emerald-100' },
  { bg: 'bg-blue-50',     border: 'border-blue-200',    text: 'text-blue-700',    dot: 'bg-blue-400',     badge: 'bg-blue-100'    },
  { bg: 'bg-violet-50',   border: 'border-violet-200',  text: 'text-violet-700',  dot: 'bg-violet-400',   badge: 'bg-violet-100'  },
  { bg: 'bg-amber-50',    border: 'border-amber-200',   text: 'text-amber-700',   dot: 'bg-amber-400',    badge: 'bg-amber-100'   },
  { bg: 'bg-rose-50',     border: 'border-rose-200',    text: 'text-rose-700',    dot: 'bg-rose-400',     badge: 'bg-rose-100'    },
  { bg: 'bg-cyan-50',     border: 'border-cyan-200',    text: 'text-cyan-700',    dot: 'bg-cyan-400',     badge: 'bg-cyan-100'    },
  { bg: 'bg-fuchsia-50',  border: 'border-fuchsia-200', text: 'text-fuchsia-700', dot: 'bg-fuchsia-400',  badge: 'bg-fuchsia-100' },
  { bg: 'bg-teal-50',     border: 'border-teal-200',    text: 'text-teal-700',    dot: 'bg-teal-400',     badge: 'bg-teal-100'    },
];

const _courseColorCache: Record<string, number> = {};
let _colorCounter = 0;

export function courseColor(course: string) {
  if (_courseColorCache[course] === undefined) {
    _courseColorCache[course] = _colorCounter % PALETTE.length;
    _colorCounter++;
  }
  return PALETTE[_courseColorCache[course]];
}

// ─────────────────────────────────────────────────────────────────────────────
// API: custom student_schedule endpoint
// ─────────────────────────────────────────────────────────────────────────────

async function fetchStudentScheduleCustom(
  studentId: string,
  startDate?: string,
  endDate?: string,
): Promise<ScheduleEntry[]> {
  const params: Record<string, string> = { student: studentId };
  if (startDate) params.start_date = startDate;
  if (endDate)   params.end_date   = endDate;

  const res: any = await apiClient.get('student_schedule', { params });
  const raw: any[] = res?.message || res?.data || [];

  // Debug log
  console.log("🔍 Useschedule API Response:", raw);

  return withDisplayTimes(raw);
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook: useStudentSchedule
// ─────────────────────────────────────────────────────────────────────────────

export function useStudentSchedule(studentId: string | undefined) {
  const [entries,     setEntries]     = useState<ScheduleEntry[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [weekOffset,  setWeekOffset]  = useState(0);
  const [viewMode,    setViewMode]    = useState<ViewMode>('week');

  const { start, end } = getWeekDates(weekOffset);

  const load = useCallback(async () => {
    if (!studentId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchStudentScheduleCustom(
        studentId,
        fmtDate(start),
        fmtDate(end),
      );
      setEntries(data);
    } catch (err: any) {
      // fallback to erpService if custom endpoint fails
      try {
        const fallback = await erpService.getWeeklySchedule(studentId, weekOffset);
        // map CourseScheduleEntry → ScheduleEntry shape
        const mapped = fallback.map((e: CourseScheduleEntry) => ({
          student_group_name: e.student_group,
          course:             e.course,
          schedule_date:      e.schedule_date,
          from_time:          e.from_time,
          to_time:            e.to_time,
          title:              e.title || e.course_name || e.course,
          custom_meeting_link: e.custom_meeting_link || null,
          student:            studentId,
          room:               e.room,
        }));
        setEntries(withDisplayTimes(mapped));
      } catch (fallbackErr: any) {
        setError(fallbackErr?.message || 'Schedule is unable to load');
      }
    } finally {
      setLoading(false);
    }
  }, [studentId, weekOffset]);

  useEffect(() => { load(); }, [load]);

  // Group by date for week view
  const byDate = entries.reduce<Record<string, ScheduleEntry[]>>((acc, e) => {
    acc[e.schedule_date] = acc[e.schedule_date] || [];
    acc[e.schedule_date].push(e);
    return acc;
  }, {});

  // Sorted unique dates
  const sortedDates = Object.keys(byDate).sort();

  return {
    entries,
    byDate,
    sortedDates,
    loading,
    error,
    weekOffset,
    setWeekOffset,
    viewMode,
    setViewMode,
    weekStart: start,
    weekEnd:   end,
    refresh:   load,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook: useAllSchedule
// ─────────────────────────────────────────────────────────────────────────────

export function useAllSchedule(studentId: string | undefined) {
  const [entries, setEntries] = useState<ScheduleEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    if (!studentId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchStudentScheduleCustom(studentId);
        if (!cancelled) setEntries(data);
      } catch (err: any) {
        if (!cancelled) setError(err?.message || 'Schedule is unable to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [studentId]);

  return { entries, loading, error };
}