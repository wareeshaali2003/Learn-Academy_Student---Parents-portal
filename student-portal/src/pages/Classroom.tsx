import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { useUser } from '../context/UserContext';
import { classroomService } from '../services/classroomService';
import { ClassroomStatus, ClassroomDashboardCourse } from '../types/classroom';
import { cn } from '../lib/utils';
import {
  GraduationCap,
  RefreshCw,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  Link2,
  Clock,
  BookOpen,
  Users,
  Loader2,
} from 'lucide-react';

function marksColor(pct: number | null) {
  if (pct == null) return 'text-gray-400 bg-gray-50 border-gray-200';
  if (pct >= 80) return 'text-emerald-700 bg-emerald-50 border-emerald-200';
  if (pct >= 60) return 'text-amber-700 bg-amber-50 border-amber-200';
  return 'text-red-700 bg-red-50 border-red-200';
}

const ConnectCard: React.FC<{ studentId: string }> = ({ studentId }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-white rounded-3xl border border-gray-100 shadow-sm p-10 text-center max-w-xl mx-auto"
  >
    <div className="w-16 h-16 rounded-3xl bg-indigo-50 border border-indigo-100 mx-auto flex items-center justify-center mb-5">
      <GraduationCap className="w-8 h-8 text-indigo-500" />
    </div>
    <h2 className="text-xl font-bold text-gray-900 mb-2">Connect Google Classroom</h2>
    <p className="text-sm text-gray-500 mb-6 leading-relaxed">
      Link your Google account to pull your lesson plans, assignments, quizzes and grades from
      Google Classroom straight into your portal. Your portal stays the single place for
      enrollment, attendance and fees — Classroom stays your learning space.
    </p>
    <button
      onClick={() => classroomService.connect(studentId)}
      className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100"
    >
      <Link2 className="w-4 h-4" />
      Connect Google Classroom
    </button>
  </motion.div>
);

export const ClassroomPage: React.FC = () => {
  const { activeStudentId } = useUser();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [status, setStatus] = useState<ClassroomStatus | null>(null);
  const [courses, setCourses] = useState<ClassroomDashboardCourse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (showSpinner: 'full' | 'refresh' = 'full') => {
    if (!activeStudentId) return;
    showSpinner === 'full' ? setIsLoading(true) : setIsRefreshing(true);
    setError(null);
    try {
      const st = await classroomService.getStatus(activeStudentId);
      setStatus(st);
      if (st.connected) {
        // Live call to Google Classroom — no local cache involved.
        const data = await classroomService.getDashboard(activeStudentId);
        setCourses(data);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load Google Classroom data');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [activeStudentId]);

  useEffect(() => {
    load('full');
  }, [load]);

  // After returning from Google's OAuth consent screen
  useEffect(() => {
    const connected = searchParams.get('connected');
    if (connected === '1') {
      load('full');
      setSearchParams({}, { replace: true });
    } else if (connected === '0') {
      setError('Google Classroom connection was cancelled or failed. Please try again.');
      setSearchParams({}, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  if (!activeStudentId) {
    return (
      <div className="py-20 text-center text-gray-400">Select a student to view Classroom data.</div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3">
        <Loader2 className="w-9 h-9 text-indigo-500 animate-spin" />
        <span className="text-sm text-gray-400 font-medium">Loading Google Classroom…</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl pb-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-indigo-500" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-gray-900">My Learning</h1>
            <p className="text-xs text-gray-400 font-medium mt-0.5">
              {status?.connected
                ? `Live from Google Classroom${status.googleEmail ? ` · ${status.googleEmail}` : ''}`
                : 'Not connected to Google Classroom'}
            </p>
          </div>
        </div>

        {status?.connected && (
          <button
            onClick={() => load('refresh')}
            disabled={isRefreshing}
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all',
              isRefreshing
                ? 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed'
                : 'bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50'
            )}
          >
            <RefreshCw className={cn('w-4 h-4', isRefreshing && 'animate-spin')} />
            {isRefreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-3 bg-red-50 text-red-600 rounded-2xl p-4 border border-red-100">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {!status?.connected ? (
        <ConnectCard studentId={activeStudentId} />
      ) : courses.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-gray-100 text-center text-gray-400">
          <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-10" />
          <p className="text-lg font-medium mb-1">No Classroom courses found</p>
          <p className="text-sm text-gray-300 mb-5">This Google account isn't enrolled as a student in any active courses.</p>
          <button
            onClick={() => load('refresh')}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors"
          >
            <RefreshCw className={cn('w-4 h-4', isRefreshing && 'animate-spin')} />
            {isRefreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  <th className="text-left font-semibold text-gray-500 px-6 py-3.5">Course</th>
                  <th className="text-left font-semibold text-gray-500 px-4 py-3.5">Teacher</th>
                  <th className="text-left font-semibold text-gray-500 px-4 py-3.5">Assignments</th>
                  <th className="text-left font-semibold text-gray-500 px-4 py-3.5">Upcoming</th>
                  <th className="text-left font-semibold text-gray-500 px-4 py-3.5">Marks</th>
                  <th className="px-4 py-3.5"></th>
                </tr>
              </thead>
              <tbody>
                {courses.map((course, i) => (
                  <motion.tr
                    key={course.classroomCourseId}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    onClick={() => navigate(`/classroom/${encodeURIComponent(course.classroomCourseId)}`)}
                    className="border-b border-gray-50 last:border-0 hover:bg-indigo-50/40 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-900">{course.name}</div>
                      {course.section && <div className="text-xs text-gray-400">{course.section}</div>}
                    </td>
                    <td className="px-4 py-4 text-gray-500">
                      <span className="inline-flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-gray-300" />
                        {course.teacher || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-gray-700 font-medium">{course.assignmentsCount}</td>
                    <td className="px-4 py-4">
                      {course.upcomingCount > 0 ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-bold">
                          <Clock className="w-3 h-3" />
                          {course.upcomingCount} due
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold">
                          <CheckCircle2 className="w-3 h-3" />
                          Caught up
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <span className={cn('px-2.5 py-1 rounded-full text-xs font-bold border', marksColor(course.marksPct))}>
                        {course.marksPct != null ? `${course.marksPct}%` : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      {course.classroomUrl && (
                        <a
                          href={course.classroomUrl}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-gray-300 hover:text-indigo-500 transition-colors"
                          title="Open in Google Classroom"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClassroomPage;
