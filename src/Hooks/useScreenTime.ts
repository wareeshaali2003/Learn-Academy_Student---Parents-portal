// hooks/useScreenTime.ts
// ✅ academic_year bhi fetch karta hai (student_schedule ke liye zaroori)
import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { apiClient, CourseScheduleEntry } from '../services/erpService';

// ── Helpers ────────────────────────────────────────────────────────────────

export function timeStrToMinutes(t?: string): number | null {
  if (!t) return null;
  const m = t.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

export function formatMinutesLabel(totalMinutes: number): string {
  const safe = Math.max(0, Math.round(totalMinutes));
  const h = Math.floor(safe / 60);
  const m = safe % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function calcDurationMin(fromTime: string, toTime: string): number {
  const from = timeStrToMinutes(fromTime);
  const to = timeStrToMinutes(toTime);
  if (from === null || to === null || to <= from) return 0;
  return to - from;
}

export const formatMinutes = formatMinutesLabel;

function pad(n: number) { return String(n).padStart(2, '0'); }
function toKey(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function startOfWeek(d: Date) {
  const x = new Date(d);
  x.setDate(x.getDate() - x.getDay());
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfWeek(d: Date) {
  const x = startOfWeek(d);
  x.setDate(x.getDate() + 6);
  return x;
}

// ── Fetch Student's Academic Year ──────────────────────────────────────────

async function fetchStudentAcademicYear(studentId: string): Promise<string | null> {
  try {
    const res: any = await apiClient.get('frappe.client.get_list', {
      params: {
        doctype: 'Program Enrollment',
        filters: JSON.stringify([
          ['student', '=', studentId],
          ['docstatus', '=', 1],
        ]),
        fields: JSON.stringify(['academic_year', 'enrollment_date']),
        order_by: 'enrollment_date desc',
        limit_page_length: 1,
      },
    });
    const rows: any[] = res?.message ?? res?.data?.message ?? [];
    return rows?.[0]?.academic_year ?? null;
  } catch (err) {
    console.error('[fetchStudentAcademicYear] error:', err);
    return null;
  }
}

// ── Types ──────────────────────────────────────────────────────────────────

export interface DayBreakdown {
  date: Date;
  key: string;
  label: string;
  fullLabel: string;
  minutes: number;
  classes: number;
}

export interface CourseBreakdownItem {
  course: string;
  minutes: number;
  classes: number;
}

export interface MonthBreakdown {
  key: string;
  label: string;
  minutes: number;
  classes: number;
}

// ── Hook ───────────────────────────────────────────────────────────────────

export function useScreenTime(studentId: string | undefined) {
  const [entries, setEntries] = useState<CourseScheduleEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const academicYearRef = useRef<string | null>(null);

  const load = useCallback(async () => {
    if (!studentId) {
      setEntries([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // ── Step 1: Academic Year nikalo (cache karo) ─────────────────────
      if (!academicYearRef.current) {
        academicYearRef.current = await fetchStudentAcademicYear(studentId);
        console.log('[useScreenTime] academic_year:', academicYearRef.current);
      }
      const academicYear = academicYearRef.current;

      if (!academicYear) {
        console.warn('[useScreenTime] No academic_year found');
        setError('Academic year nahi mila. Program Enrollment check karein.');
        setEntries([]);
        return;
      }

      // ── Step 2: student_schedule endpoint with academic_year ──────────
      console.log('[useScreenTime] Fetching:', studentId, '| year:', academicYear);

      const res: any = await apiClient.get('student_schedule', {
        params: {
          student: studentId,
          academic_year: academicYear,       // ✅ YE ZAROORI THA!
        },
      });

      const raw: any[] = res?.message ?? res?.data?.message ?? [];
      console.log('[useScreenTime] Loaded:', raw.length, 'entries');

      const mapped: CourseScheduleEntry[] = raw.map((e: any) => ({
        name: e.name,
        course: e.course,
        course_name: e.course_name || e.course,
        instructor: e.instructor,
        instructor_name: e.instructor_name,
        room: e.room,
        schedule_date: e.schedule_date,
        from_time: e.from_time,
        to_time: e.to_time,
        student_group: e.student_group || e.student_group_name,
        color: e.color,
        class_schedule_color: e.class_schedule_color,
        title: e.title,
        program: e.program,
        custom_meeting_link: e.custom_meeting_link || e.meeting_link,
      }));

      setEntries(mapped);
    } catch (err: any) {
      console.error('[useScreenTime] error:', err);
      setError(
        err?.response?.data?.message ||
          err?.message ||
          'Screen time load nahi ho saka'
      );
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  // Reset cached academic_year jab student change ho
  useEffect(() => {
    academicYearRef.current = null;
  }, [studentId]);

  useEffect(() => { load(); }, [load]);

  // ── Group by date ─────────────────────────────────────────────────────
  const byDate = useMemo(() => {
    const map: Record<string, CourseScheduleEntry[]> = {};
    for (const e of entries) {
      const k = (e.schedule_date || '').slice(0, 10);
      if (!k) continue;
      if (!map[k]) map[k] = [];
      map[k].push(e);
    }
    return map;
  }, [entries]);

  // ── TODAY ─────────────────────────────────────────────────────────────
  const todayKey = toKey(new Date());
  const todayEntries = useMemo(() => byDate[todayKey] ?? [], [byDate, todayKey]);
  const todayMinutes = useMemo(
    () => todayEntries.reduce((s, e) => s + calcDurationMin(e.from_time, e.to_time), 0),
    [todayEntries]
  );

  // ── THIS WEEK ─────────────────────────────────────────────────────────
  const weekStartKey = useMemo(() => toKey(startOfWeek(new Date())), []);
  const weekEndKey = useMemo(() => toKey(endOfWeek(new Date())), []);

  const weekEntries = useMemo(
    () =>
      entries.filter((e) => {
        const k = (e.schedule_date || '').slice(0, 10);
        return k >= weekStartKey && k <= weekEndKey;
      }),
    [entries, weekStartKey, weekEndKey]
  );
  const weekMinutes = useMemo(
    () => weekEntries.reduce((s, e) => s + calcDurationMin(e.from_time, e.to_time), 0),
    [weekEntries]
  );

  // ── THIS MONTH ────────────────────────────────────────────────────────
  const monthPrefix = todayKey.slice(0, 7);
  const monthEntries = useMemo(
    () => entries.filter((e) => (e.schedule_date || '').slice(0, 7) === monthPrefix),
    [entries, monthPrefix]
  );
  const monthMinutes = useMemo(
    () => monthEntries.reduce((s, e) => s + calcDurationMin(e.from_time, e.to_time), 0),
    [monthEntries]
  );

  // ── DAILY BREAKDOWN ───────────────────────────────────────────────────
  const dailyBreakdown: DayBreakdown[] = useMemo(() => {
    const days: DayBreakdown[] = [];
    const start = startOfWeek(new Date());
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const key = toKey(d);
      const dayEntries = byDate[key] ?? [];
      days.push({
        date: d,
        key,
        label: d.toLocaleDateString('en-US', { weekday: 'short' }),
        fullLabel: d.toLocaleDateString('en-PK', {
          weekday: 'long', day: 'numeric', month: 'short',
        }),
        minutes: dayEntries.reduce(
          (s, e) => s + calcDurationMin(e.from_time, e.to_time),
          0
        ),
        classes: dayEntries.length,
      });
    }
    return days;
  }, [byDate]);

  // ── COURSE BREAKDOWN ──────────────────────────────────────────────────
  const courseBreakdown: CourseBreakdownItem[] = useMemo(() => {
    const map: Record<string, { minutes: number; classes: number }> = {};
    for (const e of monthEntries) {
      const c = e.course_name || e.course;
      if (!c) continue;
      if (!map[c]) map[c] = { minutes: 0, classes: 0 };
      map[c].minutes += calcDurationMin(e.from_time, e.to_time);
      map[c].classes += 1;
    }
    return Object.entries(map)
      .map(([course, { minutes, classes }]) => ({ course, minutes, classes }))
      .sort((a, b) => b.minutes - a.minutes);
  }, [monthEntries]);

  // ── MONTHLY BREAKDOWN ─────────────────────────────────────────────────
  const monthlyBreakdown: MonthBreakdown[] = useMemo(() => {
    const map: Record<string, { minutes: number; classes: number }> = {};
    for (const e of entries) {
      const k = (e.schedule_date || '').slice(0, 7);
      if (!k) continue;
      if (!map[k]) map[k] = { minutes: 0, classes: 0 };
      map[k].minutes += calcDurationMin(e.from_time, e.to_time);
      map[k].classes += 1;
    }
    return Object.entries(map)
      .map(([key, { minutes, classes }]) => {
        const [y, m] = key.split('-');
        const d = new Date(parseInt(y), parseInt(m) - 1, 1);
        return {
          key,
          label: d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          minutes,
          classes,
        };
      })
      .sort((a, b) => b.key.localeCompare(a.key));
  }, [entries]);

  // ── ALL COURSES ───────────────────────────────────────────────────────
  const allCourses = useMemo(() => {
    const set = new Set<string>();
    for (const e of entries) {
      const c = e.course_name || e.course;
      if (c) set.add(c);
    }
    return [...set];
  }, [entries]);

  // ── DATE RANGE ────────────────────────────────────────────────────────
  const dateRange = useMemo(() => {
    if (entries.length === 0) return null;
    const dates = entries
      .map((e) => (e.schedule_date || '').slice(0, 10))
      .filter(Boolean)
      .sort();
    return {
      earliest: dates[0],
      latest: dates[dates.length - 1],
    };
  }, [entries]);

  return {
    entries,
    loading,
    error,
    refetch: load,
    todayEntries,
    todayMinutes,
    weekMinutes,
    weekEntries,
    monthMinutes,
    monthEntries,
    dailyBreakdown,
    courseBreakdown,
    monthlyBreakdown,
    allCourses,
    dateRange,
  };
}