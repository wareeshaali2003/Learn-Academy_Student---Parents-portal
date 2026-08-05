import React, { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';
import {
  erpService,
  ProgramEnrollment,
  EnrolledCourse,
} from '../services/erpService';
import { motion, AnimatePresence } from 'motion/react';
import {
  BookOpen, GraduationCap, Hash, Calendar,
  ChevronDown, ChevronRight, Loader2, AlertCircle,
  CheckCircle2, XCircle, Clock, Layers,
  BookMarked, Award,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ProgramInfo {
  name: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hooks
// ─────────────────────────────────────────────────────────────────────────────

export function useEnrolledCourses(studentId: string | undefined) {
  const [enrollments, setEnrollments] = useState<ProgramEnrollment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    if (!studentId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await erpService.getEnrolledCourses(studentId);
        if (!cancelled) setEnrollments(data);
      } catch (err: any) {
        if (!cancelled) setError(err?.message || 'Courses load nahi ho sake');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [studentId]);

  return { enrollments, loading, error };
}

export function usePrograms() {
  const [programs, setPrograms] = useState<ProgramInfo[]>([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await erpService.getPrograms();
        if (!cancelled) setPrograms(data);
      } catch (err: any) {
        if (!cancelled) setError(err?.message || 'Programs load nahi ho sake');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return { programs, loading, error };
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-PK', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

function docstatusLabel(ds: number): { label: string; cls: string; icon: React.ElementType } {
  const map: Record<number, { label: string; cls: string; icon: React.ElementType }> = {
    0: { label: 'Draft',     cls: 'bg-gray-100 text-gray-500 border-gray-200',          icon: Clock },
    1: { label: 'Submitted', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200',  icon: CheckCircle2 },
    2: { label: 'Cancelled', cls: 'bg-red-50 text-red-500 border-red-200',              icon: XCircle },
  };
  return map[ds] ?? map[0];
}

// Color palette for course cards — cycles through
const COURSE_PALETTES = [
  { bg: 'bg-blue-50',    border: 'border-blue-200',    text: 'text-blue-700',    icon: 'text-blue-400',    dot: 'bg-blue-400' },
  { bg: 'bg-violet-50',  border: 'border-violet-200',  text: 'text-violet-700',  icon: 'text-violet-400',  dot: 'bg-violet-400' },
  { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', icon: 'text-emerald-400', dot: 'bg-emerald-400' },
  { bg: 'bg-amber-50',   border: 'border-amber-200',   text: 'text-amber-700',   icon: 'text-amber-400',   dot: 'bg-amber-400' },
  { bg: 'bg-rose-50',    border: 'border-rose-200',    text: 'text-rose-700',    icon: 'text-rose-400',    dot: 'bg-rose-400' },
  { bg: 'bg-cyan-50',    border: 'border-cyan-200',    text: 'text-cyan-700',    icon: 'text-cyan-400',    dot: 'bg-cyan-400' },
  { bg: 'bg-teal-50',    border: 'border-teal-200',    text: 'text-teal-700',    icon: 'text-teal-400',    dot: 'bg-teal-400' },
  { bg: 'bg-orange-50',  border: 'border-orange-200',  text: 'text-orange-700',  icon: 'text-orange-400',  dot: 'bg-orange-400' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

interface CourseCardProps {
  course: EnrolledCourse;
  index: number;
}

const CourseCard: React.FC<CourseCardProps> = ({ course, index }) => {
  const p = COURSE_PALETTES[index % COURSE_PALETTES.length];
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.04 }}
      className={`rounded-2xl border ${p.bg} ${p.border} p-4 flex flex-col gap-2 hover:shadow-md transition-shadow`}
    >
      <div className={`w-8 h-8 rounded-xl ${p.bg} border ${p.border} flex items-center justify-center`}>
        <BookMarked className={`w-4 h-4 ${p.icon}`} />
      </div>
      <p className={`text-sm font-bold leading-snug ${p.text}`}>
        {course.course_name || course.course}
      </p>
      <p className={`text-[10px] font-medium ${p.icon} opacity-70`}>
        {course.course}
      </p>
    </motion.div>
  );
};

interface EnrollmentCardProps {
  enrollment: ProgramEnrollment;
  enrollIndex: number;
  globalCourseOffset: number;
}

const EnrollmentCard: React.FC<EnrollmentCardProps> = ({
  enrollment, enrollIndex, globalCourseOffset,
}) => {
  const [expanded, setExpanded] = useState(true);
  const ds = docstatusLabel(enrollment.docstatus);
  const DsIcon = ds.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: enrollIndex * 0.08 }}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
    >
      {/* ── Header ── */}
      <div
        className="flex items-center gap-3 px-5 py-4 cursor-pointer select-none
                   hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="w-10 h-10 rounded-xl bg-green-50 border border-green-100
                        flex items-center justify-center shrink-0">
          <GraduationCap className="w-5 h-5 text-primary-green" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-extrabold text-gray-900 truncate">
              {enrollment.program}
            </h3>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border flex items-center gap-1 ${ds.cls}`}>
              <DsIcon className="w-3 h-3" />
              {ds.label}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
            <span className="text-[11px] text-gray-400 font-medium flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {enrollment.academic_year}
            </span>
            {enrollment.student_batch_name && (
              <span className="text-[11px] text-gray-400 font-medium flex items-center gap-1">
                <Hash className="w-3 h-3" />
                {enrollment.student_batch_name}
              </span>
            )}
            <span className="text-[11px] text-gray-400 font-medium flex items-center gap-1">
              <BookOpen className="w-3 h-3" />
              {enrollment.courses.length} courses
            </span>
          </div>
        </div>

        <motion.div
          animate={{ rotate: expanded ? 90 : 0 }}
          transition={{ duration: 0.2 }}
          className="shrink-0"
        >
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </motion.div>
      </div>

      {/* ── Meta strip ── */}
      <div className="border-t border-gray-50 px-5 py-2 flex items-center gap-4 flex-wrap bg-gray-50/50">
        <span className="text-[11px] text-gray-400">
          <span className="font-semibold text-gray-500">Term:</span> {enrollment.academic_term || '—'}
        </span>
        <span className="text-[11px] text-gray-400">
          <span className="font-semibold text-gray-500">Enrolled:</span> {formatDate(enrollment.enrollment_date)}
        </span>
        <span className="text-[11px] text-gray-400">
          <span className="font-semibold text-gray-500">Ref:</span> {enrollment.name}
        </span>
      </div>

      {/* ── Courses grid ── */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-5 py-4">
              {enrollment.courses.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                  {enrollment.courses.map((course, ci) => (
                    <CourseCard
                      key={course.name}
                      course={course}
                      index={globalCourseOffset + ci}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-3 py-3 text-gray-300">
                  <BookOpen className="w-4 h-4" />
                  <p className="text-sm italic">No courses in this enrollment</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// CoursesPage
// ─────────────────────────────────────────────────────────────────────────────

export const CoursesPage: React.FC = () => {
  const { user } = useUser();
  const studentId = user?.name;

  const { enrollments, loading: enrollLoading, error: enrollError } = useEnrolledCourses(studentId);
  const { programs,    loading: progLoading,   error: progError    } = usePrograms();

  const isLoading  = enrollLoading || progLoading;
  const allCourses = enrollments.flatMap(e => e.courses);

  // Track global course index for consistent color cycling across enrollments
  const courseOffsets: number[] = [];
  let offset = 0;
  for (const e of enrollments) {
    courseOffsets.push(offset);
    offset += e.courses.length;
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3">
        <Loader2 className="w-9 h-9 text-primary-green animate-spin" />
        <span className="text-sm text-gray-400 font-medium">Loading courses…</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl pb-8">

      {/* ── Page header ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="flex items-center gap-3"
      >
        <div className="w-10 h-10 rounded-2xl bg-green-50 border border-green-100
                        flex items-center justify-center">
          <Layers className="w-5 h-5 text-primary-green" />
        </div>
        <div>
          <h1 className="text-lg font-extrabold text-gray-900">Your Courses</h1>
          <p className="text-xs text-gray-400 font-medium mt-0.5">
            {allCourses.length} courses across {enrollments.length} enrollment{enrollments.length !== 1 ? 's' : ''}
          </p>
        </div>
      </motion.div>

      {/* ── Summary stat pills ── */}
      {enrollments.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05 }}
          className="flex flex-wrap gap-2"
        >
          {[
            { label: 'Total Courses',    value: allCourses.length,                                      cls: 'bg-blue-50 border-blue-200 text-blue-700' },
            { label: 'Enrollments',      value: enrollments.length,                                     cls: 'bg-green-50 border-green-200 text-green-700' },
            { label: 'Submitted',        value: enrollments.filter(e => e.docstatus === 1).length,      cls: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
            { label: 'Cancelled',        value: enrollments.filter(e => e.docstatus === 2).length,      cls: 'bg-red-50 border-red-200 text-red-500' },
          ].map(({ label, value, cls }) => (
            <div key={label} className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[11px] font-semibold ${cls}`}>
              <span className="text-sm font-extrabold">{value}</span>
              {label}
            </div>
          ))}
        </motion.div>
      )}

      {/* ── Error states ── */}
      {(enrollError || progError) && (
        <div className="flex items-center gap-3 bg-red-50 text-red-600 rounded-2xl p-4 border border-red-100">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <p className="text-sm">{enrollError || progError}</p>
        </div>
      )}

      {/* ── Enrollment cards ── */}
      {enrollments.length > 0 ? (
        <div className="space-y-4">
          {enrollments.map((enrollment, i) => (
            <EnrollmentCard
              key={enrollment.name}
              enrollment={enrollment}
              enrollIndex={i}
              globalCourseOffset={courseOffsets[i]}
            />
          ))}
        </div>
      ) : !enrollLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-3 py-20 text-center"
        >
          <div className="w-16 h-16 rounded-3xl bg-gray-50 border border-gray-100
                          flex items-center justify-center">
            <BookOpen className="w-7 h-7 text-gray-300" />
          </div>
          <p className="text-sm font-semibold text-gray-400">No enrollments found</p>
          <p className="text-xs text-gray-300 max-w-48">
            You are not enrolled in any program yet.
          </p>
        </motion.div>
      )}

      {/* ── Available Programs ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm"
      >
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 rounded-md bg-green-50 flex items-center justify-center">
            <Award className="w-3.5 h-3.5 text-primary-green" />
          </div>
          <h3 className="text-sm font-bold text-gray-700">Available Programs</h3>
          <span className="ml-auto text-xs text-gray-400 font-medium">
            {programs.length} programs
          </span>
        </div>

        {progLoading ? (
          <div className="flex items-center gap-2 py-4">
            <Loader2 className="w-4 h-4 text-gray-300 animate-spin" />
            <span className="text-sm text-gray-300">Loading programs…</span>
          </div>
        ) : programs.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {programs.map((prog, i) => {
              // Highlight programs the student is enrolled in
              const isEnrolled = enrollments.some(e => e.program === prog.name);
              return (
                <motion.span
                  key={prog.name}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.2, delay: i * 0.02 }}
                  className={`text-[11px] font-semibold px-3 py-1.5 rounded-full border transition-all ${
                    isEnrolled
                      ? 'bg-green-100 border-green-300 text-green-700 ring-1 ring-green-200'
                      : 'bg-gray-50 border-gray-200 text-gray-500'
                  }`}
                >
                  {isEnrolled && (
                    <CheckCircle2 className="w-3 h-3 inline mr-1 text-green-500" />
                  )}
                  {prog.name}
                </motion.span>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-gray-300 italic">No programs available</p>
        )}

        {programs.length > 0 && enrollments.length > 0 && (
          <p className="text-[10px] text-gray-400 mt-3 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-green-500" />
            Green = programs you're enrolled in
          </p>
        )}
      </motion.div>

    </div>
  );
};

export default CoursesPage;