import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calendar, Clock, BookOpen, Users, MapPin,
  Video, ChevronLeft, ChevronRight, Loader2,
  AlertCircle, GraduationCap, Zap,
} from 'lucide-react';
import { useUser } from '../context/UserContext';
import { apiClient } from '../services/erpService';

export interface ScheduleEntry {
  student_group_name: string;
  course: string;
  schedule_date: string;
  from_time: string;
  to_time: string;
  title: string;
  custom_meeting_link: string | null;
  meeting_link: string | null;
  student: string;
  room: string;
}

const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAYS_FULL  = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS     = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

const COURSE_PALETTE: Record<string, { bg: string; border: string; text: string; accent: string; dot: string }> = {};
const PALETTE_POOL = [
  { bg: 'bg-blue-50',    border: 'border-blue-200',    text: 'text-blue-800',    accent: 'bg-blue-500',    dot: 'bg-blue-400'    },
  { bg: 'bg-violet-50',  border: 'border-violet-200',  text: 'text-violet-800',  accent: 'bg-violet-500',  dot: 'bg-violet-400'  },
  { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-800', accent: 'bg-emerald-500', dot: 'bg-emerald-400' },
  { bg: 'bg-amber-50',   border: 'border-amber-200',   text: 'text-amber-800',   accent: 'bg-amber-500',   dot: 'bg-amber-400'   },
  { bg: 'bg-rose-50',    border: 'border-rose-200',    text: 'text-rose-800',    accent: 'bg-rose-500',    dot: 'bg-rose-400'    },
  { bg: 'bg-cyan-50',    border: 'border-cyan-200',    text: 'text-cyan-800',    accent: 'bg-cyan-500',    dot: 'bg-cyan-400'    },
];
let _paletteIdx = 0;
function getCourseColor(course: string) {
  if (!COURSE_PALETTE[course]) {
    COURSE_PALETTE[course] = PALETTE_POOL[_paletteIdx % PALETTE_POOL.length];
    _paletteIdx++;
  }
  return COURSE_PALETTE[course];
}

function pad(n: number) { return String(n).padStart(2, '0'); }
function parseTime(t: string): string {
  const [hStr, mStr] = t.split(':');
  let h = parseInt(hStr, 10);
  const m = mStr;
  const ampm = h >= 12 ? 'PM' : 'AM';
  if (h > 12) h -= 12;
  if (h === 0) h = 12;
  return `${pad(h)}:${m} ${ampm}`;
}
function formatCourseName(raw: string): string {
  const parts = raw.split('-').filter(Boolean);
  if (parts.length >= 3) return `${parts[1]} · ${parts.slice(2).join(' ')}`;
  return raw;
}
function formatGroupName(raw: string): string {
  if (/^SECTION\s/i.test(raw)) return raw.replace(/^SECTION\s/i, 'Section ');
  const last = raw.split('-').pop() || raw;
  return `Group ${last}`;
}
function isoToKey(dateStr: string): string { return dateStr.slice(0, 10); }
function startOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}
function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}
function toKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
function isToday(date: Date): boolean {
  const t = new Date();
  return date.getFullYear() === t.getFullYear() &&
    date.getMonth() === t.getMonth() &&
    date.getDate()  === t.getDate();
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useStudentSchedule(studentId: string | null | undefined, academicYear = '2025') {
  const [entries, setEntries] = useState<ScheduleEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!studentId) return;
    setLoading(true);
    setError(null);
    try {
      const res: any = await apiClient.get('student_schedule', {
        params: { student: studentId, academic_year: academicYear },
      });
      const raw: any[] = res?.message ?? res?.data?.message ?? [];
      const data: ScheduleEntry[] = raw.map((e: any) => ({
        ...e,
        meeting_link:        e.meeting_link        || e.custom_meeting_link || null,
        custom_meeting_link: e.custom_meeting_link || e.meeting_link        || null,
      }));
      setEntries(data);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
        err?.response?.data?.exc_type ||
        err?.message ||
        'Schedule load nahi ho saka'
      );
    } finally {
      setLoading(false);
    }
  }, [studentId, academicYear]);

  useEffect(() => { load(); }, [load]);

  const byDate = React.useMemo(() => {
    const map: Record<string, ScheduleEntry[]> = {};
    for (const e of entries) {
      const k = isoToKey(e.schedule_date);
      if (!map[k]) map[k] = [];
      map[k].push(e);
    }
    for (const k in map) {
      map[k].sort((a, b) => a.from_time.localeCompare(b.from_time));
    }
    return map;
  }, [entries]);

  const courses = React.useMemo(() => {
    const seen = new Set<string>();
    return entries
      .filter(e => { const n = !seen.has(e.course); seen.add(e.course); return n; })
      .map(e => e.course);
  }, [entries]);

  return { entries, byDate, courses, loading, error, refetch: load };
}

// ── ClassCard ─────────────────────────────────────────────────────────────────

const ClassCard: React.FC<{ entry: ScheduleEntry; index: number }> = ({ entry, index }) => {
  const c          = getCourseColor(entry.course);
  const courseName = formatCourseName(entry.course);
  const groupName  = formatGroupName(entry.student_group_name);
  const fromTime   = parseTime(entry.from_time);
  const toTime     = parseTime(entry.to_time);

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.06 }}
      className={`relative flex gap-3 rounded-2xl border ${c.bg} ${c.border} px-4 py-3.5 overflow-hidden group`}
    >
      <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl ${c.accent}`} />
      <div className="flex flex-col items-center justify-center shrink-0 w-14 text-center">
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{fromTime.split(' ')[1]}</span>
        <span className={`text-base font-extrabold ${c.text}`}>{fromTime.split(' ')[0]}</span>
        <div className="w-4 border-t border-gray-300 my-1" />
        <span className="text-[10px] font-semibold text-gray-400">{toTime.split(' ')[0]}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-extrabold ${c.text} leading-tight truncate`}>{courseName}</p>
        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5">
          <span className="flex items-center gap-1 text-[10px] text-gray-500 font-medium">
            <Users className="w-3 h-3" /> {groupName}
          </span>
          <span className="flex items-center gap-1 text-[10px] text-gray-500 font-medium">
            <GraduationCap className="w-3 h-3" />
            {entry.title?.split(' by ')[1] ?? '—'}
          </span>
          {entry.room && (
            <span className="flex items-center gap-1 text-[10px] text-gray-500 font-medium">
              <MapPin className="w-3 h-3" />
              <span className="truncate max-w-[90px]" title={entry.room}>{entry.room}</span>
            </span>
          )}
        </div>
        {(entry.meeting_link || entry.custom_meeting_link) && (
          <a
            href={(entry.meeting_link || entry.custom_meeting_link)!}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="mt-2.5 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl
                       bg-green-500 hover:bg-green-600 active:scale-95
                       text-white text-[11px] font-bold shadow-sm shadow-green-200
                       transition-all duration-150 select-none"
          >
            <Video className="w-3.5 h-3.5" /> Join Class
          </a>
        )}
      </div>
    </motion.div>
  );
};

// ── WeekStrip ─────────────────────────────────────────────────────────────────

const WeekStrip: React.FC<{
  weekStart: Date;
  selectedDate: Date;
  byDate: Record<string, ScheduleEntry[]>;
  onSelect: (d: Date) => void;
}> = ({ weekStart, selectedDate, byDate, onSelect }) => (
  <div className="grid grid-cols-7 gap-1">
    {Array.from({ length: 7 }, (_, i) => {
      const d   = addDays(weekStart, i);
      const key = toKey(d);
      const cnt = byDate[key]?.length ?? 0;
      const sel = toKey(selectedDate) === key;
      const tod = isToday(d);
      return (
        <button key={key} type="button" onClick={() => onSelect(d)}
          className={`flex flex-col items-center gap-0.5 py-2 px-1 rounded-xl transition-all
            ${sel ? 'bg-primary-green text-white shadow-md shadow-green-200'
                  : tod ? 'bg-green-50 text-green-700 border border-green-200'
                        : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
        >
          <span className="text-[9px] font-bold uppercase tracking-wider opacity-70">{DAYS_SHORT[d.getDay()]}</span>
          <span className="text-sm font-extrabold">{d.getDate()}</span>
          {cnt > 0 ? <span className={`w-4 h-1.5 rounded-full ${sel ? 'bg-white/50' : 'bg-green-400'}`} />
                   : <span className="w-4 h-1.5" />}
        </button>
      );
    })}
  </div>
);

// ── MiniCal ───────────────────────────────────────────────────────────────────

const MiniCal: React.FC<{
  year: number; month: number;
  byDate: Record<string, ScheduleEntry[]>;
  selectedDate: Date;
  onSelect: (d: Date) => void;
}> = ({ year, month, byDate, selectedDate, onSelect }) => {
  const first       = new Date(year, month, 1);
  const startOffset = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
  ];
  return (
    <div>
      <div className="grid grid-cols-7 gap-px mb-1">
        {DAYS_SHORT.map(d => (
          <span key={d} className="text-[9px] font-bold text-center text-gray-400 uppercase tracking-wider py-1">{d[0]}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px">
        {cells.map((d, i) => {
          if (!d) return <div key={i} />;
          const key = toKey(d);
          const cnt = byDate[key]?.length ?? 0;
          const sel = toKey(selectedDate) === key;
          const tod = isToday(d);
          return (
            <button key={key} type="button" onClick={() => onSelect(d)}
              className={`relative aspect-square flex flex-col items-center justify-center rounded-lg transition-all text-[11px] font-bold
                ${sel ? 'bg-primary-green text-white shadow-sm' : tod ? 'bg-green-50 text-green-700' : 'hover:bg-gray-50 text-gray-600'}`}
            >
              {d.getDate()}
              {cnt > 0 && (
                <span className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full ${sel ? 'bg-white/60' : 'bg-green-400'}`} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ── SchedulePage ──────────────────────────────────────────────────────────────

export const SchedulePage: React.FC = () => {
  const { studentId } = useUser();

  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [weekStart,    setWeekStart]    = useState<Date>(() => startOfWeek(new Date()));
  const [calYear,      setCalYear]      = useState(() => new Date().getFullYear());
  const [calMonth,     setCalMonth]     = useState(() => new Date().getMonth());

  const { byDate, courses, loading, error, refetch } = useStudentSchedule(studentId);

  const handleSelectDate = useCallback((d: Date) => {
    setSelectedDate(d);
    setWeekStart(startOfWeek(d));
    setCalYear(d.getFullYear());
    setCalMonth(d.getMonth());
  }, []);

  const prevWeek = () => { const w = addDays(weekStart, -7); setWeekStart(w); setCalYear(w.getFullYear()); setCalMonth(w.getMonth()); };
  const nextWeek = () => { const w = addDays(weekStart,  7); setWeekStart(w); setCalYear(w.getFullYear()); setCalMonth(w.getMonth()); };

  const todayClasses  = byDate[toKey(selectedDate)] ?? [];
  const selectedKey   = toKey(selectedDate);
  const totalForMonth = Object.entries(byDate)
    .filter(([k]) => { const d = new Date(k); return d.getFullYear() === calYear && d.getMonth() === calMonth; })
    .reduce((s, [, v]) => s + v.length, 0);

  return (
    <div className="space-y-5 max-w-4xl pb-8">

      {/* Header Banner */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm"
      >
        <div className="h-24 bg-gradient-to-r from-green-600 via-emerald-500 to-teal-500 relative flex items-end px-6 pb-4">
          <div className="absolute inset-0 opacity-20"
            style={{ backgroundImage: `radial-gradient(circle, white 1px, transparent 1px)`, backgroundSize: '24px 24px' }} />
          <div className="relative flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-white leading-tight">Class Schedule</h2>
              <p className="text-[11px] text-white/70 font-medium">Academic Year 2025</p>
            </div>
          </div>
        </div>
        <div className="px-5 pt-4 pb-3">
          <div className="flex items-center justify-between mb-3">
            <button type="button" onClick={prevWeek} className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
              <ChevronLeft className="w-4 h-4 text-gray-600" />
            </button>
            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">
              {MONTHS[weekStart.getMonth()]} {weekStart.getFullYear()}
            </span>
            <button type="button" onClick={nextWeek} className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
              <ChevronRight className="w-4 h-4 text-gray-600" />
            </button>
          </div>
          <WeekStrip weekStart={weekStart} selectedDate={selectedDate} byDate={byDate} onSelect={handleSelectDate} />
        </div>
      </motion.div>

      {/* Cards row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {courses.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm"
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-md bg-green-50 flex items-center justify-center">
                <Zap className="w-3.5 h-3.5 text-primary-green" />
              </div>
              <h3 className="text-sm font-bold text-gray-700">Courses</h3>
            </div>
            <div className="space-y-2">
              {courses.map(course => {
                const c = getCourseColor(course);
                return (
                  <div key={course} className={`flex items-center gap-2.5 rounded-xl border ${c.bg} ${c.border} px-3 py-2`}>
                    <span className={`w-2 h-2 rounded-full shrink-0 ${c.dot}`} />
                    <span className={`text-xs font-semibold ${c.text}`}>{formatCourseName(course)}</span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm"
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-md bg-green-50 flex items-center justify-center">
              <Clock className="w-3.5 h-3.5 text-primary-green" />
            </div>
            <h3 className="text-sm font-bold text-gray-700">Overview</h3>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Total Classes', value: Object.values(byDate).flat().length },
              { label: 'Courses',       value: courses.length },
              { label: 'Class Days',    value: Object.keys(byDate).length },
              { label: 'Today',         value: (byDate[toKey(new Date())] ?? []).length },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-xl bg-gray-50 border border-gray-100 p-3 text-center">
                <p className="text-xl font-extrabold text-gray-800">{value}</p>
                <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm"
        >
          <div className="flex items-center justify-between mb-3">
            <button type="button"
              onClick={() => { const d = new Date(calYear, calMonth - 1, 1); setCalYear(d.getFullYear()); setCalMonth(d.getMonth()); }}
              className="w-6 h-6 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center">
              <ChevronLeft className="w-3.5 h-3.5 text-gray-500" />
            </button>
            <span className="text-xs font-extrabold text-gray-700">{MONTHS[calMonth].slice(0, 3)} {calYear}</span>
            <button type="button"
              onClick={() => { const d = new Date(calYear, calMonth + 1, 1); setCalYear(d.getFullYear()); setCalMonth(d.getMonth()); }}
              className="w-6 h-6 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center">
              <ChevronRight className="w-3.5 h-3.5 text-gray-500" />
            </button>
          </div>
          <MiniCal year={calYear} month={calMonth} byDate={byDate} selectedDate={selectedDate} onSelect={handleSelectDate} />
          <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between">
            <span className="text-[10px] text-gray-400 font-medium">This month</span>
            <span className="text-xs font-extrabold text-primary-green">{totalForMonth} classes</span>
          </div>
        </motion.div>
      </div>

      {/* Day schedule */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
        className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{DAYS_FULL[selectedDate.getDay()]}</p>
            <h3 className="text-base font-extrabold text-gray-800">
              {selectedDate.getDate()} {MONTHS[selectedDate.getMonth()]}
              {isToday(selectedDate) && (
                <span className="ml-2 text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full align-middle">Today</span>
              )}
            </h3>
          </div>
          <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-100 rounded-xl px-3 py-1.5">
            <BookOpen className="w-3.5 h-3.5 text-primary-green" />
            <span className="text-xs font-bold text-gray-600">{todayClasses.length} class{todayClasses.length !== 1 ? 'es' : ''}</span>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-primary-green" />
            <span className="text-sm text-gray-400 font-medium">Loading schedule…</span>
          </div>
        ) : error ? (
          <div className="flex items-center gap-3 bg-red-50 text-red-600 rounded-2xl p-4 border border-red-100">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold">Schedule load nahi ho saka</p>
              <p className="text-xs text-red-400 mt-0.5">{error}</p>
            </div>
            <button type="button" onClick={refetch} className="text-xs font-bold text-red-500 hover:text-red-700 underline">Retry</button>
          </div>
        ) : todayClasses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 gap-3">
            <div className="w-14 h-14 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center">
              <Calendar className="w-7 h-7 text-gray-300" />
            </div>
            <p className="text-sm font-semibold text-gray-400">No classes scheduled</p>
            <p className="text-xs text-gray-300">Pick another day from the calendar</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div key={selectedKey} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-2.5"
            >
              {todayClasses.map((entry, i) => (
                <ClassCard key={`${entry.course}-${entry.from_time}`} entry={entry} index={i} />
              ))}
            </motion.div>
          </AnimatePresence>
        )}
      </motion.div>
    </div>
  );
};

export default SchedulePage;