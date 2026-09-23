import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { format } from 'date-fns';
import { useUser } from '../context/UserContext';
import { classroomService } from '../services/classroomService';
import { ClassroomCourseDetail as CourseDetail, ClassroomAssignment } from '../types/classroom';
import { cn } from '../lib/utils';
import {
  ArrowLeft,
  ExternalLink,
  Clock,
  FileText,
  HelpCircle,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Layers,
  GraduationCap,
} from 'lucide-react';

function statusStyle(status: ClassroomAssignment['status']) {
  switch (status) {
    case 'Submitted':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'Returned':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'Late':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'Missing':
      return 'bg-red-50 text-red-700 border-red-200';
    default:
      return 'bg-gray-50 text-gray-500 border-gray-200';
  }
}

const AssignmentRow: React.FC<{ item: ClassroomAssignment }> = ({ item }) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3 px-4 rounded-2xl hover:bg-gray-50 transition-colors">
    <div className="flex items-start gap-3">
      <div className={cn('p-2 rounded-xl shrink-0', item.isQuiz ? 'bg-violet-50 text-violet-600' : 'bg-blue-50 text-blue-600')}>
        {item.isQuiz ? <HelpCircle className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
      </div>
      <div>
        <p className="font-semibold text-gray-900 text-sm">{item.title}</p>
        <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-gray-400">
          {item.dueDate && (
            <span className="inline-flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Due {format(new Date(item.dueDate), 'MMM dd, yyyy')}
            </span>
          )}
          {item.maxPoints != null && <span>Marks: {item.maxPoints}</span>}
        </div>
      </div>
    </div>
    <div className="flex items-center gap-3 pl-11 sm:pl-0">
      {item.assignedGrade != null && item.maxPoints ? (
        <span className="text-sm font-bold text-indigo-600">
          {item.assignedGrade}/{item.maxPoints}
        </span>
      ) : null}
      <span className={cn('px-3 py-1 rounded-full text-xs font-bold border', statusStyle(item.status))}>
        {item.status}
      </span>
      {item.classroomUrl && (
        <a href={item.classroomUrl} target="_blank" rel="noreferrer" className="text-gray-300 hover:text-indigo-500 transition-colors">
          <ExternalLink className="w-4 h-4" />
        </a>
      )}
    </div>
  </div>
);

export const ClassroomCourseDetailPage: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const { activeStudentId } = useUser();
  const navigate = useNavigate();

  const [detail, setDetail] = useState<CourseDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!activeStudentId || !courseId) return;
      setIsLoading(true);
      setError(null);
      try {
        const data = await classroomService.getCourseDetail(activeStudentId, courseId);
        setDetail(data);
      } catch (err: any) {
        setError(err?.response?.data?.error === 'course_not_found'
          ? 'This course was not found — try syncing again from My Learning.'
          : err?.message || 'Failed to load course');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [activeStudentId, courseId]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3">
        <Loader2 className="w-9 h-9 text-indigo-500 animate-spin" />
        <span className="text-sm text-gray-400 font-medium">Loading course…</span>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center">
        <AlertCircle className="w-12 h-12 text-red-300 mx-auto mb-4" />
        <p className="text-gray-500 mb-6">{error || 'Course not found'}</p>
        <button
          onClick={() => navigate('/classroom')}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to My Learning
        </button>
      </div>
    );
  }

  const gradedCount = detail.assignments.filter((a) => a.assignedGrade != null).length;

  return (
    <div className="space-y-6 max-w-4xl pb-8">
      <button
        onClick={() => navigate('/classroom')}
        className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        My Learning
      </button>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
              <GraduationCap className="w-6 h-6 text-indigo-500" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-gray-900">{detail.name}</h1>
              <p className="text-sm text-gray-400 mt-0.5">
                {detail.teacher ? `Teacher: ${detail.teacher}` : detail.section || 'Google Classroom'}
              </p>
            </div>
          </div>
          {detail.classroomUrl && (
            <a
              href={detail.classroomUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors shrink-0"
            >
              Open Google Classroom
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </motion.div>

      {/* Upcoming work */}
      {detail.upcomingWork.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-500" />
            Upcoming Work
          </h2>
          <div className="divide-y divide-gray-50">
            {detail.upcomingWork.map((item) => (
              <AssignmentRow key={item.id} item={item} />
            ))}
          </div>
        </motion.div>
      )}

      {/* Lesson plan by topic */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
          <Layers className="w-4 h-4 text-indigo-500" />
          Lesson Plan
        </h2>
        {detail.lessonPlan.length === 0 ? (
          <p className="text-sm text-gray-300 italic">No topics published for this course yet.</p>
        ) : (
          <div className="space-y-5">
            {detail.lessonPlan.map((topic) => (
              <div key={topic.topicId ?? 'other'}>
                <h3 className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">{topic.name}</h3>
                {topic.items.length === 0 ? (
                  <p className="text-xs text-gray-300 italic pl-4">No coursework yet</p>
                ) : (
                  <div className="divide-y divide-gray-50 border border-gray-50 rounded-2xl overflow-hidden">
                    {topic.items.map((item) => (
                      <AssignmentRow key={item.id} item={item} />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Gradebook summary */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          Gradebook ({gradedCount} graded)
        </h2>
        {gradedCount === 0 ? (
          <p className="text-sm text-gray-300 italic">No grades returned yet.</p>
        ) : (
          <div className="space-y-2">
            {detail.assignments
              .filter((a) => a.assignedGrade != null)
              .map((a) => (
                <div key={a.id} className="flex items-center justify-between text-sm py-1.5">
                  <span className="text-gray-600">{a.title}</span>
                  <span className="font-bold text-gray-900">
                    {a.assignedGrade}/{a.maxPoints}
                  </span>
                </div>
              ))}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default ClassroomCourseDetailPage;
