// pages/AssignmentsPage.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAssignments } from '../Hooks/Useassignment';
import { useUser } from '../context/UserContext';
import { erpService, AssignmentSubmission } from '../services/erpService';
import { format, parseISO } from 'date-fns';
import {
  ClipboardList, BookOpen, Calendar, AlertCircle,
  Users, Search, CheckCircle2,
} from 'lucide-react';
import { cn } from '../lib/utils';

function parseAssignmentCourse(code: string): { cls: string; subject: string } | null {
  if (!code) return null;
  const match = code.match(/^[A-Z]+-([^-]+)-([A-Za-z0-9]+)$/);
  if (!match) return null;
  return { cls: match[1], subject: match[2] };
}

type FilterTab = 'all' | 'submitted' | 'unsubmitted';

const StatCard: React.FC<{
  icon: React.ReactNode;
  iconClass: string;
  label: string;
  value: number;
}> = ({ icon, iconClass, label, value }) => (
  <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
    <div className={cn('p-3 rounded-xl flex-shrink-0', iconClass)}>{icon}</div>
    <div className="min-w-0">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-extrabold text-gray-900 leading-tight">{value}</p>
    </div>
  </div>
);

function InfoPill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-md">
      {icon}
      <span className="font-medium truncate max-w-[140px]">{label}</span>
    </span>
  );
}

const AssignmentCard: React.FC<{
  heading: string;
  description: string;
  course: string;
  date: string;
  isSubmitted: boolean;
  onSubmit: () => void;
}> = ({ heading, description, course, date, isSubmitted, onSubmit }) => {
  const parsed = parseAssignmentCourse(course);
  const safeDescription = description ?? '';
  const dateObj = parseISO(date);

  return (
    <div className="px-5 py-4 hover:bg-gray-50/50 transition-colors">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl flex flex-col items-center justify-center flex-shrink-0 border bg-blue-50 border-blue-100 text-blue-700">
          <span className="text-base font-extrabold leading-none">{format(dateObj, 'd')}</span>
          <span className="text-[9px] font-semibold uppercase tracking-wide opacity-70">{format(dateObj, 'MMM')}</span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <p className="text-sm font-bold text-gray-800">{heading || 'Untitled Assignment'}</p>
            {isSubmitted && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-green-700 bg-green-50 border border-green-100 px-2 py-0.5 rounded-full">
                <CheckCircle2 className="w-3 h-3" /> Already Submitted
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5 mb-2">
            {course && (
              <InfoPill
                icon={<BookOpen className="w-3 h-3 text-blue-400" />}
                label={parsed ? parsed.subject : course}
              />
            )}
            {parsed?.cls && (
              <InfoPill icon={<Users className="w-3 h-3 text-violet-400" />} label={parsed.cls} />
            )}
            <InfoPill
              icon={<Calendar className="w-3 h-3 text-gray-400" />}
              label={format(dateObj, 'd MMM yyyy')}
            />
          </div>

          {safeDescription ? (
            <p className="text-sm text-gray-600 whitespace-pre-line leading-relaxed">{safeDescription}</p>
          ) : (
            <p className="text-sm text-gray-400 italic">No description provided</p>
          )}

          <div className="flex items-center justify-end mt-2">
            <button
              onClick={onSubmit}
              className="text-xs font-semibold text-white bg-primary-green px-3 py-1.5 rounded-lg hover:opacity-90 transition-opacity"
            >
              View
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const AssignmentsPage: React.FC = () => {
  const { role, activeStudentId, user } = useUser();
  const { assignments, isLoading, error } = useAssignments();
  const [search, setSearch] = useState('');
  const [subjectFilter, setSubjectFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<FilterTab>('all');
  const navigate = useNavigate();

  const isGuardian = role === 'guardian';
  const studentId = isGuardian ? activeStudentId : (activeStudentId ?? user?.name);

  // ── Fetch this student's submissions once, map by assignment name ─────────
  const [submissionsMap, setSubmissionsMap] = useState<Record<string, AssignmentSubmission>>({});

  useEffect(() => {
    if (!studentId) return;
    let cancelled = false;
    erpService.getSubmissionsForStudent(studentId).then((list) => {
      if (cancelled) return;
      const map: Record<string, AssignmentSubmission> = {};
      list.forEach((s) => { map[s.assignment] = s; });
      setSubmissionsMap(map);
    });
    return () => { cancelled = true; };
  }, [studentId]);

  const subjects = useMemo(() => {
    const set = new Set<string>();
    assignments.forEach(a => {
      const parsed = parseAssignmentCourse(a.course);
      if (parsed) set.add(parsed.subject);
    });
    return ['All', ...Array.from(set)];
  }, [assignments]);

  // ── Attach submitted flag to each assignment ───────────────────────────────
  const withStatus = useMemo(() => {
    return assignments.map(a => {
      const sub = submissionsMap[a.name];
      const isSubmitted = sub?.status === 'Submitted' || sub?.status === 'Graded';
      return { ...a, _isSubmitted: isSubmitted };
    });
  }, [assignments, submissionsMap]);

  const counts = useMemo(() => {
    return {
      submitted: withStatus.filter(a => a._isSubmitted).length,
      unsubmitted: withStatus.filter(a => !a._isSubmitted).length,
    };
  }, [withStatus]);

  if (isGuardian && !activeStudentId) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3 text-center px-6">
        <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mb-2">
          <Users className="w-7 h-7 text-blue-400" />
        </div>
        <p className="text-base font-bold text-gray-700">No student is selected</p>
        <p className="text-sm text-gray-400 max-w-xs">
          Select a student from the menu above to view their assignments.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-green" />
        <p className="text-sm text-gray-400 font-medium">Loading assignments…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-3 p-4 bg-red-50 text-red-700 rounded-2xl border border-red-100">
        <AlertCircle className="w-5 h-5 flex-shrink-0" />
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  const sorted = [...withStatus].sort(
    (a, b) => new Date(b.creation).getTime() - new Date(a.creation).getTime()
  );

  const filtered = sorted.filter(a => {
    const parsed = parseAssignmentCourse(a.course);
    const matchesSubject = subjectFilter === 'All' || parsed?.subject === subjectFilter;
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'submitted' && a._isSubmitted) ||
      (statusFilter === 'unsubmitted' && !a._isSubmitted);
    const q = search.trim().toLowerCase();
    const matchesSearch = !q ||
      (a.heading ?? '').toLowerCase().includes(q) ||
      (a.description ?? '').toLowerCase().includes(q);
    return matchesSubject && matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-5 max-w-4xl pb-8">

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon={<ClipboardList className="w-5 h-5" />}
          iconClass="bg-blue-50 text-blue-600"
          label="Total Assignments"
          value={assignments.length}
        />
        <StatCard
          icon={<CheckCircle2 className="w-5 h-5" />}
          iconClass="bg-green-50 text-green-600"
          label="Submitted"
          value={counts.submitted}
        />
        <StatCard
          icon={<BookOpen className="w-5 h-5" />}
          iconClass="bg-violet-50 text-violet-600"
          label="Subjects"
          value={Math.max(subjects.length - 1, 0)}
        />
      </div>

      {/* List View */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">

       {/* Search + Filter tabs */}
<div className="p-4 border-b border-gray-50 bg-gray-50/50 space-y-3">
  <div className="relative">
    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
    <input
      type="text"
      value={search}
      onChange={e => setSearch(e.target.value)}
      placeholder="Search assignments…"
      className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-100 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-green/30"
    />
  </div>

  {/* Status filter */}
  <div>
    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Status</p>
    <div className="flex gap-1.5 flex-wrap">
      {([
        ['all', 'All'],
        ['submitted', 'Submitted'],
        ['unsubmitted', 'Unsubmitted'],
      ] as [FilterTab, string][]).map(([key, label]) => (
        <button
          key={key}
          onClick={() => setStatusFilter(key)}
          className={cn(
            'px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all border',
            statusFilter === key
              ? 'bg-primary-green text-white border-primary-green'
              : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
          )}
        >
          {label}
        </button>
      ))}
    </div>
  </div>

  {/* Subject filter */}
  <div>
    <div className="flex items-center justify-between mb-1.5">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Subject</p>
      <span className="text-xs text-gray-400 font-medium">{filtered.length} records</span>
    </div>
    <div className="flex gap-1.5 flex-wrap">
      {subjects.map(s => (
        <button
          key={s}
          onClick={() => setSubjectFilter(s)}
          className={cn(
            'px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all border',
            subjectFilter === s
              ? 'bg-gray-800 text-white border-gray-800'
              : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
          )}
        >
          {s}
        </button>
      ))}
    </div>
  </div>
</div>

        {/* Records */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
            <ClipboardList className="w-8 h-8 opacity-40" />
            <p className="text-sm font-medium">No assignments found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filtered.map(a => (
              <AssignmentCard
                key={a.name}
                heading={a.heading}
                description={a.description}
                course={a.course}
                date={a.creation}
                isSubmitted={a._isSubmitted}
                onSubmit={() => navigate(`/assignments/${a.name}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};