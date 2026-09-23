// pages/Dashboard.tsx
import React, { useEffect, useState, useMemo } from 'react';
import { useUser } from '../context/UserContext';
import { erpService, CourseScheduleEntry } from '../services/erpService';
import { Attendance, Assignment, Result, Quiz } from '../types';
import { useStudentSchedule, ScheduleEntry } from './Schedulepage';
import { useScreenTime, formatMinutes } from '../Hooks/useScreenTime';
import { useLoginActivity, formatDuration } from '../Hooks/useLoginActivity';
import {
  CalendarCheck, FileText, GraduationCap, BrainCircuit,
  TrendingUp, CheckCircle2, AlertCircle, Clock, Target,
  XCircle, MinusCircle, Users, Bell, Newspaper, Radio,
  ScrollText, Inbox, CalendarDays, MapPin, Video,
  ChevronLeft, ChevronRight, BookOpen, Zap, Activity,
} from 'lucide-react';
import { format } from 'date-fns';
import { useNoticeBoard } from '../Hooks/Usenoticeboard';

// ── Helper functions ─────────────────────────────────────────────────────────
function pct(num: number, den: number) {
  if (!den) return 0;
  return Math.round((num / den) * 100);
}

function gradeColor(p: number) {
  if (p >= 80) return 'text-emerald-700 bg-emerald-50';
  if (p >= 60) return 'text-amber-700 bg-amber-50';
  return 'text-red-700 bg-red-50';
}

function barColor(p: number) {
  if (p >= 80) return 'bg-emerald-500';
  if (p >= 60) return 'bg-amber-500';
  return 'bg-red-500';
}

function gradeLabel(p: number) {
  if (p >= 90) return 'A+';
  if (p >= 80) return 'A';
  if (p >= 70) return 'B';
  if (p >= 60) return 'C';
  if (p >= 50) return 'D';
  return 'F';
}

function formatCourseLabel(code: string): string {
  if (!code) return code;
  const withSection = code.match(/^[A-Z]+-([^-]+)-([A-Z])-([A-Za-z]+)\d+$/);
  if (withSection) return `${withSection[1]} · ${withSection[2]} · ${withSection[3]}`;
  const withoutSection = code.match(/^[A-Z]+-([^-]+)-([A-Za-z]+)\d+$/);
  if (withoutSection) return `${withoutSection[1]} · ${withoutSection[2]}`;
  return code;
}

function stripSchoolPrefix(raw: string): string {
  return raw.replace(/^[A-Z]{1,5}-/, '');
}

function fmtDateLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return fmtDateLocal(a) === fmtDateLocal(b);
}

function toKey(date: Date): string {
  return fmtDateLocal(date);
}

function parseTime(t: string): string {
  const [hStr, mStr] = t.split(':');
  let h = parseInt(hStr, 10);
  const m = mStr;
  const ampm = h >= 12 ? 'PM' : 'AM';
  if (h > 12) h -= 12;
  if (h === 0) h = 12;
  return `${String(h).padStart(2, '0')}:${m} ${ampm}`;
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

// ── Course colour palette ────────────────────────────────────────────────────
const PALETTE = [
  { bg: 'bg-blue-50',    border: 'border-blue-200',    text: 'text-blue-800',    accent: 'bg-blue-500',    dot: 'bg-blue-400' },
  { bg: 'bg-violet-50',  border: 'border-violet-200',  text: 'text-violet-800',  accent: 'bg-violet-500',  dot: 'bg-violet-400' },
  { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-800', accent: 'bg-emerald-500', dot: 'bg-emerald-400' },
  { bg: 'bg-amber-50',   border: 'border-amber-200',   text: 'text-amber-800',   accent: 'bg-amber-500',   dot: 'bg-amber-400' },
  { bg: 'bg-rose-50',    border: 'border-rose-200',    text: 'text-rose-800',    accent: 'bg-rose-500',    dot: 'bg-rose-400' },
  { bg: 'bg-cyan-50',    border: 'border-cyan-200',    text: 'text-cyan-800',    accent: 'bg-cyan-500',    dot: 'bg-cyan-400' },
];

const _courseColorCache: Record<string, number> = {};
let _colorCounter = 0;

function getCourseColor(course: string) {
  if (_courseColorCache[course] === undefined) {
    _courseColorCache[course] = _colorCounter % PALETTE.length;
    _colorCounter++;
  }
  return PALETTE[_courseColorCache[course]];
}

// ── Class Card Component ────────────────────────────────────────────────────
const ClassCard: React.FC<{ entry: ScheduleEntry; index: number; isGuardian: boolean }> = ({ entry, index, isGuardian }) => {
  const c = getCourseColor(entry.course);
  const courseName = formatCourseName(entry.course);
  const groupName = formatGroupName(entry.student_group_name);
  const fromTime = parseTime(entry.from_time);
  const toTime = parseTime(entry.to_time);
  const hasLink = !!(entry.meeting_link || entry.custom_meeting_link);

  const isActive = (() => {
    const today = new Date();
    const entryDate = entry.schedule_date.slice(0, 10);
    const todayKey = fmtDateLocal(today);
    if (entryDate !== todayKey) return false;
    const now = today.getHours() * 60 + today.getMinutes();
    const [fromH, fromM] = entry.from_time.split(':').map(Number);
    const [toH, toM] = entry.to_time.split(':').map(Number);
    const start = fromH * 60 + fromM - 10;
    const end = toH * 60 + toM;
    return now >= start && now <= end;
  })();

  return (
    <div className={`relative flex gap-3 rounded-2xl border ${c.bg} ${c.border} px-4 py-3.5 overflow-hidden group`}>
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

        {hasLink && !isGuardian && (
          isActive ? (
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
          ) : (
            <span className="mt-2.5 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl
                             bg-gray-100 text-gray-400 text-[11px] font-bold
                             cursor-not-allowed select-none">
              <Video className="w-3.5 h-3.5" /> Join Class
            </span>
          )
        )}
      </div>
    </div>
  );
};

// ── Components ───────────────────────────────────────────────────────────────

const Section: React.FC<{ title: string; icon: React.ReactNode; count?: number; headerExtra?: React.ReactNode; children: React.ReactNode }> = ({ title, icon, count, headerExtra, children }) => (
  <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
    <div className="p-5 border-b border-gray-50 flex items-center gap-2 flex-wrap">
      <div className="p-2 rounded-xl bg-gray-50 text-gray-500">{icon}</div>
      <h2 className="font-bold text-base text-gray-900">{title}</h2>
      {count !== undefined && (
        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">{count}</span>
      )}
      {headerExtra && <div className="ml-auto flex items-center gap-2">{headerExtra}</div>}
    </div>
    {children}
  </div>
);

const EmptyState: React.FC<{ icon: React.ReactNode; label: string }> = ({ icon, label }) => (
  <div className="p-12 text-center text-gray-400">
    <div className="w-12 h-12 mx-auto mb-3 opacity-20">{icon}</div>
    <p className="text-sm">{label}</p>
  </div>
);

const NOTICE_TYPE_CONFIG = {
  NEWS:     { label: 'News',     icon: <Newspaper className="w-3 h-3" />,  color: 'text-blue-700 bg-blue-50',    dot: 'bg-blue-500' },
  STREAM:   { label: 'Stream',   icon: <Radio className="w-3 h-3" />,      color: 'text-purple-700 bg-purple-50', dot: 'bg-purple-500' },
  CIRCULAR: { label: 'Circular', icon: <ScrollText className="w-3 h-3" />, color: 'text-amber-700 bg-amber-50',  dot: 'bg-amber-500' },
} as const;

// ── Main Dashboard ───────────────────────────────────────────────────────────

export const Dashboard: React.FC = () => {
  const { user, role, activeStudentId } = useUser();

  const isGuardian = role === 'guardian';

  const studentId: string | undefined = isGuardian
    ? (activeStudentId ?? undefined)
    : (activeStudentId ?? user?.name ?? undefined);

  // ── Hooks: Schedule, Screen Time, Login Activity ────────────────────────────
  const { byDate, courses, loading: scheduleLoading, error: scheduleError, refetch } = useStudentSchedule(studentId);
  const { todayMinutes, todayEntries } = useScreenTime(studentId);
  const { sessions, isCurrentlyOnline, totalTimeTodayMs } = useLoginActivity();

  const [attendance, setAttendance]   = useState<Attendance[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [results, setResults]         = useState<Result[]>([]);
  const [quizzes, setQuizzes]         = useState<Quiz[]>([]);
  const [isLoading, setIsLoading]     = useState(true);
  const [studentName, setStudentName] = useState<string>('');

  const { notices, isLoading: noticesLoading } = useNoticeBoard();
  const latestNotices = notices.slice(0, 4);

  const [pickedDate, setPickedDate] = useState<Date>(new Date());
  const [calYear, setCalYear] = useState(() => new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(() => new Date().getMonth());
  const isTodayPicked = isSameDay(pickedDate, new Date());

  const totalForMonth = useMemo(() => {
    return Object.entries(byDate)
      .filter(([k]) => {
        const d = new Date(k);
        return d.getFullYear() === calYear && d.getMonth() === calMonth;
      })
      .reduce((s, [, v]) => s + v.length, 0);
  }, [byDate, calYear, calMonth]);

  const selectedKey = toKey(pickedDate);
  const selectedDaySchedule = useMemo(() => {
    const list = byDate[selectedKey] || [];
    return [...list].sort((a, b) => a.from_time.localeCompare(b.from_time));
  }, [byDate, selectedKey]);

  const calendarCells = useMemo(() => {
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const startWeekday = new Date(calYear, calMonth, 1).getDay();
    const cells: (Date | null)[] = [];
    for (let i = 0; i < startWeekday; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push(new Date(calYear, calMonth, d));
    }
    return cells;
  }, [calYear, calMonth]);

  const classDaySet = useMemo(() => new Set(Object.keys(byDate)), [byDate]);

  const goPrevMonth = () => {
    const d = new Date(calYear, calMonth - 1, 1);
    setCalYear(d.getFullYear());
    setCalMonth(d.getMonth());
  };

  const goNextMonth = () => {
    const d = new Date(calYear, calMonth + 1, 1);
    setCalYear(d.getFullYear());
    setCalMonth(d.getMonth());
  };

  const goToday = () => {
    const today = new Date();
    setCalYear(today.getFullYear());
    setCalMonth(today.getMonth());
    setPickedDate(today);
  };

  useEffect(() => {
    if (!studentId) {
      setIsLoading(false);
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      try {
        if (isGuardian) {
          erpService.getStudentById(studentId).then(s => {
            if (s?.student_name) setStudentName(s.student_name);
          }).catch(() => {});
        }

        const [attData, assData, resData, quizData] = await Promise.all([
          erpService.getAttendance(studentId),
          erpService.getAssignments(studentId),
          erpService.getResults(studentId),
          erpService.getQuizzes(studentId),
        ]);
        setAttendance(attData || []);
        setAssignments(assData || []);
        setResults(resData || []);
        setQuizzes(quizData || []);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [studentId, isGuardian]);

  // ── Stats calculations ────────────────────────────────────────────────────
  const presentCount    = attendance.filter(a => a.status === 'Present').length;
  const absentCount     = attendance.filter(a => a.status === 'Absent').length;
  const leaveCount      = attendance.filter(a => a.status === 'On Leave').length;
  const attPct          = pct(presentCount, attendance.length);
  const pendingAssign   = assignments.filter(a => a.status === 'Pending');
  const submittedAssign = assignments.filter(a => a.status !== 'Pending');
  const bestResultPct   = results.length > 0
    ? Math.max(...results.map(r => { const max = r.maximum_score || r.total_weightage || 0; return max > 0 ? pct(r.total_score, max) : 0; }))
    : 0;
  const avgResult = results.length > 0
    ? Math.round(results.reduce((acc, r) => { const max = r.maximum_score || r.total_weightage || 0; return acc + (max > 0 ? pct(r.total_score, max) : 0); }, 0) / results.length)
    : 0;

  // ── Screen Time card ───────────────────────────────────────────────────────
  const peiraLimit = 180; // minutes
  const screenTimePct = todayMinutes > 0 ? Math.min(100, Math.round((todayMinutes / peiraLimit) * 100)) : 0;

  // ── Login Activity card ────────────────────────────────────────────────────
  const loginSessionsToday = sessions.filter(s => {
    if (!s.loginTime) return false;
    const today = new Date();
    return (
      s.loginTime.getFullYear() === today.getFullYear() &&
      s.loginTime.getMonth() === today.getMonth() &&
      s.loginTime.getDate() === today.getDate()
    );
  }).length;

  const stats = [
    {
      label: 'Attendance',
      value: `${attPct}%`,
      sub: `${presentCount} present · ${leaveCount} leave · ${absentCount} absent`,
      icon: <CalendarCheck className="w-6 h-6" />,
      color: 'bg-emerald-50 text-emerald-600',
      bar: attPct,
      barColor: attPct >= 75 ? 'bg-emerald-500' : 'bg-red-500',
    },
    {
      label: 'Screen Time',
      value: formatMinutes(todayMinutes),
      sub: `${todayEntries.length} classes scheduled today`,
      icon: <Clock className="w-6 h-6" />,
      color: 'bg-indigo-50 text-indigo-600',
      bar: screenTimePct,
      barColor: screenTimePct >= 85 ? 'bg-red-500' : 'bg-indigo-500',
    },
    {
      label: 'Avg Score',
      value: `${avgResult}%`,
      sub: `${results.length} result${results.length !== 1 ? 's' : ''} recorded`,
      icon: <GraduationCap className="w-6 h-6" />,
      color: 'bg-green-50 text-primary-green',
      bar: avgResult,
      barColor: avgResult >= 60 ? 'bg-green-500' : 'bg-red-500',
    },
    {
      label: 'Login Activity',
      value: formatDuration(totalTimeTodayMs),
      sub: `${loginSessionsToday} session${loginSessionsToday !== 1 ? 's' : ''} today · ${isCurrentlyOnline ? 'Online' : 'Offline'}`,
      icon: <Activity className="w-6 h-6" />,
      color: 'bg-cyan-50 text-cyan-600',
      bar: 0,
      barColor: 'bg-cyan-500',
    },
  ];

  // ── Guardian no child selected ────────────────────────────────────────────
  if (isGuardian && !activeStudentId) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3 text-center px-6">
        <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mb-2">
          <Users className="w-7 h-7 text-blue-400" />
        </div>
        <p className="text-base font-bold text-gray-700">Koi bachha select nahi hua</p>
        <p className="text-sm text-gray-400 max-w-xs">
          Upar menu se apna bachha select karein taake dashboard dekh sakein.
        </p>
      </div>
    );
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-36 bg-white rounded-3xl border border-gray-100" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-64 bg-white rounded-3xl border border-gray-100" />)}
          <div className="col-span-1 lg:col-span-2 h-40 bg-white rounded-3xl border border-gray-100" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-slide-up">

      {/* Guardian banner */}
      {isGuardian && studentName && (
        <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3">
          <Users className="w-4 h-4 text-blue-500 shrink-0" />
          <p className="text-xs text-blue-700 font-medium">
            You are viewing <span className="font-bold">{studentName}</span>'s dashboard
          </p>
        </div>
      )}

      {/* ── 4 Stats Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow group">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-2xl transition-transform group-hover:scale-110 ${stat.color}`}>{stat.icon}</div>
              <TrendingUp className="w-4 h-4 text-gray-300" />
            </div>
            <h3 className="text-gray-500 text-sm font-medium">{stat.label}</h3>
            <span className="text-2xl font-bold text-gray-900 block mb-1">{stat.value}</span>
            <p className="text-xs text-gray-400 mb-3">{stat.sub}</p>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-700 ${stat.barColor}`} style={{ width: `${stat.bar}%` }} />
            </div>
          </div>
        ))}
      </div>

      {/* ── Main Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── Class Schedule ── */}
        <Section
          title="Class Schedule"
          icon={<CalendarDays className="w-4 h-4" />}
          count={selectedDaySchedule.length}
          headerExtra={
            !isTodayPicked && (
              <button
                onClick={goToday}
                className="text-xs font-semibold text-primary-green bg-green-50 border border-green-100 px-2.5 py-1 rounded-lg hover:bg-green-100 transition-colors"
              >
                Today
              </button>
            )
          }
        >
          <div className="p-5">
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={goPrevMonth}
                className="p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:text-gray-700 hover:border-gray-300 transition-colors"
                title="Previous month"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="flex items-center gap-1.5 text-sm font-bold text-gray-800">
                <CalendarDays className="w-3.5 h-3.5 text-primary-green" />
                {format(new Date(calYear, calMonth, 1), 'MMMM yyyy')}
              </span>
              <button
                onClick={goNextMonth}
                className="p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:text-gray-700 hover:border-gray-300 transition-colors"
                title="Next month"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-1">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                <div key={i} className="text-center text-[10px] font-bold text-gray-400">{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {calendarCells.map((cell, idx) => {
                if (!cell) return <div key={idx} />;
                const dateStr     = fmtDateLocal(cell);
                const hasClass    = classDaySet.has(dateStr);
                const isSelected  = isSameDay(cell, pickedDate);
                const isTodayCell = isSameDay(cell, new Date());
                return (
                  <button
                    key={idx}
                    onClick={() => setPickedDate(cell)}
                    className={`relative flex flex-col items-center justify-center h-8 rounded-lg text-[11px] font-semibold transition-colors
                      ${isSelected
                        ? 'bg-primary-green text-white shadow-sm'
                        : isTodayCell
                          ? 'bg-green-50 text-primary-green ring-1 ring-green-200'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                  >
                    {cell.getDate()}
                    {hasClass && (
                      <span className={`absolute bottom-0.5 w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-primary-green'}`} />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
              <span className="text-[11px] text-gray-400 font-medium">This month</span>
              <span className="text-[11px] text-primary-green font-bold">
                {scheduleLoading ? '…' : `${totalForMonth} class${totalForMonth !== 1 ? 'es' : ''}`}
              </span>
            </div>
          </div>

          <div className="px-5 pb-2 border-t border-gray-50 pt-3">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">
              {format(pickedDate, 'EEEE, d MMM yyyy')}
            </p>
          </div>

          {scheduleLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="animate-pulse h-16 bg-gray-50 rounded-xl" />
              ))}
            </div>
          ) : scheduleError ? (
            <div className="p-4 text-center text-red-500 text-sm">
              <AlertCircle className="w-5 h-5 mx-auto mb-2" />
              <p>Schedule load nahi ho saka</p>
              <button onClick={refetch} className="text-xs text-primary-green underline mt-1">Retry</button>
            </div>
          ) : selectedDaySchedule.length === 0 ? (
            <EmptyState
              icon={<CalendarDays className="w-full h-full" />}
              label={isTodayPicked ? 'No class scheduled for today' : 'No class scheduled for this date'}
            />
          ) : (
            <div className="divide-y divide-gray-50 max-h-72 overflow-y-auto p-4 space-y-3">
              {selectedDaySchedule.map((entry: ScheduleEntry, index: number) => (
                <ClassCard
                  key={`${entry.course}-${entry.from_time}`}
                  entry={entry}
                  index={index}
                  isGuardian={isGuardian}
                />
              ))}
            </div>
          )}
        </Section>

        {/* Assignments */}
        <Section title="Assignments" icon={<FileText className="w-4 h-4" />} count={assignments.length}>
          {assignments.length === 0 ? (
            <EmptyState icon={<FileText className="w-full h-full" />} label="No assignments found" />
          ) : (
            <div className="divide-y divide-gray-50">
              {assignments.slice(0, 6).map((a) => {
                const isPending = a.status === 'Pending';
                const due = new Date(a.due_date);
                const overdue = isPending && due < new Date();
                return (
                  <div key={a.name} className="p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors">
                    <div className={`p-2 rounded-xl shrink-0 ${isPending ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
                      {isPending ? <Clock className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm truncate">{a.assignment_name}</p>
                      <p className={`text-xs mt-0.5 ${overdue ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                        {overdue ? '⚠ Overdue · ' : 'Due: '}{format(due, 'MMM dd, yyyy')}
                      </p>
                    </div>
                    <span className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-bold ${isPending ? overdue ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {a.status}
                    </span>
                  </div>
                );
              })}
              {assignments.length > 6 && (
                <div className="px-4 py-2 text-center text-xs text-gray-400">
                  +{assignments.length - 6} more assignments
                </div>
              )}
            </div>
          )}
        </Section>

        {/* Attendance */}
        <Section title="Attendance" icon={<CalendarCheck className="w-4 h-4" />} count={attendance.length}>
          {attendance.length === 0 ? (
            <EmptyState icon={<CalendarCheck className="w-full h-full" />} label="No attendance records" />
          ) : (
            <>
              <div className="px-5 pt-4 pb-3">
                <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                  <span className="font-medium text-emerald-600">{presentCount} Present</span>
                  <span className="font-bold text-gray-700">{attPct}%</span>
                  <span className="font-medium text-amber-500">{leaveCount} Leave</span>
                  <span className="font-medium text-red-500">{absentCount} Absent</span>
                </div>
                <div className="h-2 bg-red-100 rounded-full overflow-hidden flex">
                  <div className="h-full bg-emerald-500 transition-all duration-700" style={{ width: `${pct(presentCount, attendance.length)}%` }} />
                  <div className="h-full bg-amber-400 transition-all duration-700" style={{ width: `${pct(leaveCount, attendance.length)}%` }} />
                </div>
                {attPct < 75 && (
                  <p className="text-xs text-red-500 font-medium mt-1.5 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Below 75% — attendance low
                  </p>
                )}
              </div>
              <div className="divide-y divide-gray-50 max-h-72 overflow-y-auto">
                {[...attendance].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 8).map((rec) => {
                  const date = new Date(rec.date);
                  const isPresent = rec.status === 'Present';
                  const isLeave   = rec.status === 'On Leave';
                  return (
                    <div key={rec.name} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                      <div className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center shrink-0 border ${isPresent ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : isLeave ? 'bg-amber-50 border-amber-100 text-amber-600' : 'bg-red-50 border-red-100 text-red-600'}`}>
                        <span className="text-sm font-extrabold leading-none">{format(date, 'd')}</span>
                        <span className="text-[9px] font-semibold uppercase tracking-wide opacity-70">{format(date, 'MMM')}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800">{format(date, 'EEE, d MMM yyyy')}</p>
                        {rec.course_schedule && (
                          <p className="text-xs text-gray-400 mt-0.5 truncate">
                            {formatCourseLabel(rec.course_schedule)}{rec.student_group ? ` · ${stripSchoolPrefix(rec.student_group)}` : ''}
                          </p>
                        )}
                      </div>
                      {isPresent ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full shrink-0"><CheckCircle2 className="w-3 h-3" /> Present</span>
                      ) : isLeave ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold bg-amber-50 text-amber-600 px-2.5 py-1 rounded-full shrink-0"><MinusCircle className="w-3 h-3" /> Leave</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold bg-red-50 text-red-600 px-2.5 py-1 rounded-full shrink-0"><XCircle className="w-3 h-3" /> Absent</span>
                      )}
                    </div>
                  );
                })}
                {attendance.length > 8 && (
                  <div className="px-4 py-2 text-center text-xs text-gray-400">
                    +{attendance.length - 8} more records
                  </div>
                )}
              </div>
            </>
          )}
        </Section>

        {/* Results */}
        <Section title="Assessment Results" icon={<GraduationCap className="w-4 h-4" />} count={results.length}>
          {results.length === 0 ? (
            <EmptyState icon={<GraduationCap className="w-full h-full" />} label="No results found" />
          ) : (
            <>
              <div className="px-5 pt-4 pb-3 border-b border-gray-50">
                <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                  <span className="font-medium text-gray-600">Best Score</span>
                  <span className={`font-bold px-2 py-0.5 rounded-full text-xs ${gradeColor(bestResultPct)}`}>{gradeLabel(bestResultPct)} · {bestResultPct}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-700 ${barColor(bestResultPct)}`} style={{ width: `${bestResultPct}%` }} />
                </div>
                <p className="text-xs text-gray-400 mt-1">Avg: {avgResult}% across {results.length} assessment{results.length !== 1 ? 's' : ''}</p>
              </div>
              <div className="divide-y divide-gray-50">
                {results.slice(0, 5).map((r) => {
                  const max   = r.maximum_score || r.total_weightage || 0;
                  const score = max > 0 ? pct(r.total_score, max) : 0;
                  return (
                    <div key={r.name} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-green-50 text-primary-green shrink-0"><Target className="w-4 h-4" /></div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 text-sm truncate">{formatCourseLabel(r.assessment_plan)}</p>
                          <p className="text-xs text-gray-400 mt-0.5">Score: {r.total_score} / {max}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${gradeColor(score)}`}>{gradeLabel(score)}</span>
                          <span className="text-sm font-bold text-gray-900 min-w-9 text-right">{score}%</span>
                        </div>
                      </div>
                      <div className="mt-2.5 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-700 ${barColor(score)}`} style={{ width: `${score}%` }} />
                      </div>
                    </div>
                  );
                })}
                {results.length > 5 && (
                  <div className="px-4 py-2 text-center text-xs text-gray-400">
                    +{results.length - 5} more results
                  </div>
                )}
              </div>
            </>
          )}
        </Section>

        {/* Quizzes */}
        <Section title="Quizzes" icon={<BrainCircuit className="w-4 h-4" />} count={quizzes.length}>
          {quizzes.length === 0 ? (
            <EmptyState icon={<BrainCircuit className="w-full h-full" />} label="No quizzes found" />
          ) : (
            <div className="divide-y divide-gray-50">
              {quizzes.slice(0, 6).map((q) => {
                const isCompleted = q.status === 'Completed';
                const score = q.score !== undefined && q.total_marks ? pct(q.score, q.total_marks) : null;
                return (
                  <div key={q.name} className="p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors">
                    <div className={`p-2 rounded-xl shrink-0 ${isCompleted ? 'bg-purple-50 text-purple-600' : 'bg-gray-50 text-gray-400'}`}>
                      {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm truncate">{q.quiz_name || q.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {q.course_name && <span>{q.course_name} · </span>}
                        {isCompleted && score !== null ? `Score: ${q.score} / ${q.total_marks} (${score}%)` : 'Not attempted'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {isCompleted && score !== null && (
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${gradeColor(score)}`}>{score}%</span>
                      )}
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${isCompleted ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-500'}`}>
                        {q.status}
                      </span>
                    </div>
                  </div>
                );
              })}
              {quizzes.length > 6 && (
                <div className="px-4 py-2 text-center text-xs text-gray-400">
                  +{quizzes.length - 6} more quizzes
                </div>
              )}
            </div>
          )}
        </Section>

        {/* ── Notice Board — full width ── */}
        <div className="col-span-1 lg:col-span-2">
          <Section title="Notice Board" icon={<Bell className="w-4 h-4" />} count={notices.length}>
            {noticesLoading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="animate-pulse h-16 bg-gray-50 rounded-xl" />
                ))}
              </div>
            ) : latestNotices.length === 0 ? (
              <EmptyState icon={<Inbox className="w-full h-full" />} label="No notices yet" />
            ) : (
              <div className="divide-y divide-gray-50">
                {latestNotices.map((notice) => {
                  const cfg = NOTICE_TYPE_CONFIG[notice.type as keyof typeof NOTICE_TYPE_CONFIG] ?? NOTICE_TYPE_CONFIG['NEWS'];
                  return (
                    <div key={notice.name} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start gap-3">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-xs font-bold shrink-0 mt-0.5 ${cfg.color}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                          {cfg.label}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 text-sm">{notice.subject}</p>
                          <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{notice.message}</p>
                        </div>
                        <span className="text-xs text-gray-300 shrink-0 whitespace-nowrap">
                          {format(new Date(notice.creation), 'dd MMM')}
                        </span>
                      </div>
                    </div>
                  );
                })}
                {notices.length > 4 && (
                  <div className="px-4 py-3 text-center">
                    <span className="text-xs text-gray-400 font-medium">
                      +{notices.length - 4} more — Notice Board mein dekho
                    </span>
                  </div>
                )}
              </div>
            )}
          </Section>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;