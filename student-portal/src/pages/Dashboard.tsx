import React, { useEffect, useState } from 'react';
import { useUser } from '../context/UserContext';
import { erpService } from '../services/erpService';
import { Attendance, Assignment, Result, Quiz } from '../types';
import {
  CalendarCheck,
  FileText,
  GraduationCap,
  BrainCircuit,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Clock,
  Target,
  XCircle,
  MinusCircle,
  Users,
  Bell,
  Newspaper,
  Radio,
  ScrollText,
  Inbox,
} from 'lucide-react';
import { format } from 'date-fns';
import { useNoticeBoard } from '../Hooks/Usenoticeboard';

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
function formatGroup(group: string): string {
  return group?.replace(/^LB-/, '') ?? group;
}

const NOTICE_TYPE_CONFIG = {
  NEWS:     { label: 'News',     icon: <Newspaper className="w-3 h-3" />,  color: 'text-blue-700 bg-blue-50',    dot: 'bg-blue-500'   },
  STREAM:   { label: 'Stream',   icon: <Radio className="w-3 h-3" />,      color: 'text-purple-700 bg-purple-50', dot: 'bg-purple-500' },
  CIRCULAR: { label: 'Circular', icon: <ScrollText className="w-3 h-3" />, color: 'text-amber-700 bg-amber-50',  dot: 'bg-amber-500'  },
} as const;

const Section: React.FC<{ title: string; icon: React.ReactNode; count?: number; children: React.ReactNode }> = ({ title, icon, count, children }) => (
  <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
    <div className="p-5 border-b border-gray-50 flex items-center gap-2">
      <div className="p-2 rounded-xl bg-gray-50 text-gray-500">{icon}</div>
      <h2 className="font-bold text-base text-gray-900">{title}</h2>
      {count !== undefined && (
        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">{count}</span>
      )}
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

export const Dashboard: React.FC = () => {
  const { user, role, activeStudentId } = useUser();

  const isGuardian = role === 'guardian';

  const studentId: string | undefined = isGuardian
    ? (activeStudentId ?? undefined)
    : (activeStudentId ?? user?.name ?? undefined);

  const [attendance, setAttendance]   = useState<Attendance[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [results, setResults]         = useState<Result[]>([]);
  const [quizzes, setQuizzes]         = useState<Quiz[]>([]);
  const [isLoading, setIsLoading]     = useState(true);
  const [studentName, setStudentName] = useState<string>('');

  // Notice Board hook
  const { notices, isLoading: noticesLoading } = useNoticeBoard();
  const latestNotices = notices.slice(0, 4);

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

  // Guardian ne koi child select nahi kiya
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
  const completedQuizzes = quizzes.filter(q => q.status === 'Completed');
  const pendingQuizzes   = quizzes.filter(q => q.status !== 'Completed');

  const stats = [
    {
      label: 'Attendance', value: `${attPct}%`,
      sub: `${presentCount} present · ${leaveCount} leave · ${absentCount} absent`,
      icon: <CalendarCheck className="w-6 h-6" />, color: 'bg-emerald-50 text-emerald-600',
      bar: attPct, barColor: attPct >= 75 ? 'bg-emerald-500' : 'bg-red-500',
    },
    {
      label: 'Assignments', value: pendingAssign.length,
      sub: `${submittedAssign.length} submitted · ${assignments.length} total`,
      icon: <FileText className="w-6 h-6" />, color: 'bg-amber-50 text-amber-600',
      bar: pct(submittedAssign.length, assignments.length), barColor: 'bg-amber-500',
    },
    {
      label: 'Avg Score', value: `${avgResult}%`,
      sub: `${results.length} result${results.length !== 1 ? 's' : ''} recorded`,
      icon: <GraduationCap className="w-6 h-6" />, color: 'bg-green-50 text-primary-green',
      bar: avgResult, barColor: avgResult >= 60 ? 'bg-green-500' : 'bg-red-500',
    },
    {
      label: 'Quizzes', value: completedQuizzes.length,
      sub: `${pendingQuizzes.length} pending · ${quizzes.length} total`,
      icon: <BrainCircuit className="w-6 h-6" />, color: 'bg-purple-50 text-purple-600',
      bar: pct(completedQuizzes.length, quizzes.length), barColor: 'bg-purple-500',
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {[1,2,3,4].map(i => <div key={i} className="h-36 bg-white rounded-3xl border border-gray-100" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1,2,3,4].map(i => <div key={i} className="h-64 bg-white rounded-3xl border border-gray-100" />)}
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

        {/* Assignments */}
        <Section title="Assignments" icon={<FileText className="w-4 h-4" />} count={assignments.length}>
          {assignments.length === 0 ? (
            <EmptyState icon={<FileText className="w-full h-full" />} label="No assignments found" />
          ) : (
            <div className="divide-y divide-gray-50">
              {assignments.map((a) => {
                const isPending = a.status === 'Pending';
                const due = new Date(a.due_date);
                const overdue = isPending && due < new Date();
                return (
                  <div key={a.name} className="p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors">
                    <div className={`p-2 rounded-xl flex-shrink-0 ${isPending ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
                      {isPending ? <Clock className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm truncate">{a.assignment_name}</p>
                      <p className={`text-xs mt-0.5 ${overdue ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                        {overdue ? '⚠ Overdue · ' : 'Due: '}{format(due, 'MMM dd, yyyy')}
                      </p>
                    </div>
                    <span className={`flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-bold ${isPending ? overdue ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {a.status}
                    </span>
                  </div>
                );
              })}
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
                {[...attendance].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((rec) => {
                  const date = new Date(rec.date);
                  const isPresent = rec.status === 'Present';
                  const isLeave   = rec.status === 'On Leave';
                  return (
                    <div key={rec.name} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                      <div className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center flex-shrink-0 border ${isPresent ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : isLeave ? 'bg-amber-50 border-amber-100 text-amber-600' : 'bg-red-50 border-red-100 text-red-600'}`}>
                        <span className="text-sm font-extrabold leading-none">{format(date, 'd')}</span>
                        <span className="text-[9px] font-semibold uppercase tracking-wide opacity-70">{format(date, 'MMM')}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800">{format(date, 'EEE, d MMM yyyy')}</p>
                        {rec.course_schedule && (
                          <p className="text-xs text-gray-400 mt-0.5 truncate">
                            {formatCourseLabel(rec.course_schedule)}{rec.student_group ? ` · ${formatGroup(rec.student_group)}` : ''}
                          </p>
                        )}
                      </div>
                      {isPresent ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full flex-shrink-0"><CheckCircle2 className="w-3 h-3" /> Present</span>
                      ) : isLeave ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold bg-amber-50 text-amber-600 px-2.5 py-1 rounded-full flex-shrink-0"><MinusCircle className="w-3 h-3" /> Leave</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold bg-red-50 text-red-600 px-2.5 py-1 rounded-full flex-shrink-0"><XCircle className="w-3 h-3" /> Absent</span>
                      )}
                    </div>
                  );
                })}
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
                {results.map((r) => {
                  const max   = r.maximum_score || r.total_weightage || 0;
                  const score = max > 0 ? pct(r.total_score, max) : 0;
                  return (
                    <div key={r.name} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-green-50 text-primary-green flex-shrink-0"><Target className="w-4 h-4" /></div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 text-sm truncate">{formatCourseLabel(r.assessment_plan)}</p>
                          <p className="text-xs text-gray-400 mt-0.5">Score: {r.total_score} / {max}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${gradeColor(score)}`}>{gradeLabel(score)}</span>
                          <span className="text-sm font-bold text-gray-900 min-w-[36px] text-right">{score}%</span>
                        </div>
                      </div>
                      <div className="mt-2.5 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-700 ${barColor(score)}`} style={{ width: `${score}%` }} />
                      </div>
                    </div>
                  );
                })}
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
              {quizzes.map((q) => {
                const isCompleted = q.status === 'Completed';
                const score = q.score !== undefined && q.total_marks ? pct(q.score, q.total_marks) : null;
                return (
                  <div key={q.name} className="p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors">
                    <div className={`p-2 rounded-xl flex-shrink-0 ${isCompleted ? 'bg-purple-50 text-purple-600' : 'bg-gray-50 text-gray-400'}`}>
                      {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm truncate">{q.quiz_name || q.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {q.course_name && <span>{q.course_name} · </span>}
                        {isCompleted && score !== null ? `Score: ${q.score} / ${q.total_marks} (${score}%)` : 'Not attempted'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
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
            </div>
          )}
        </Section>

        {/* ── Notice Board — full width, Quizzes ke baad ── */}
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
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-xs font-bold flex-shrink-0 mt-0.5 ${cfg.color}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                          {cfg.label}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 text-sm">{notice.subject}</p>
                          <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{notice.message}</p>
                        </div>
                        <span className="text-xs text-gray-300 flex-shrink-0 whitespace-nowrap">
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