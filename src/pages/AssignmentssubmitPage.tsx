// pages/Assignmentssubmit.tsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, Users, Calendar, Send, Save, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useAssignments } from '../Hooks/Useassignment';
import { useAssignmentSubmission } from '../Hooks/useAssignmentSubmission';
import { cn } from '../lib/utils';

function parseAssignmentCourse(code: string): { cls: string; subject: string } | null {
  if (!code) return null;
  const match = code.match(/^[A-Z]+-([^-]+)-([A-Za-z0-9]+)$/);
  if (!match) return null;
  return { cls: match[1], subject: match[2] };
}

const statusStyles: Record<string, string> = {
  Draft: 'bg-gray-100 text-gray-600',
  Submitted: 'bg-blue-50 text-blue-700',
  Graded: 'bg-green-50 text-green-700',
};

export const AssignmentssubmitPage: React.FC = () => {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();

  // Reuse the list hook and find the matching assignment by name.
  const { assignments, isLoading: isListLoading } = useAssignments();
  const assignment = assignments.find(a => a.name === name) ?? null;

  const {
    submission, isLoading: isSubLoading, isSaving, error, saveDraft, submitFinal,
  } = useAssignmentSubmission(
    name ?? '',
    assignment?.course ?? '',
    assignment?.link_gdbv ?? ''
  );

  const [answer, setAnswer] = useState('');

  useEffect(() => {
    if (submission?.answer) setAnswer(submission.answer);
  }, [submission?.answer]);

  const locked = submission?.status === 'Submitted' || submission?.status === 'Graded';
  const parsed = assignment ? parseAssignmentCourse(assignment.course) : null;

  const handleSubmit = async () => {
    if (!answer.trim()) return;
    if (!window.confirm('After submitting assignment you can not submit it again?')) return;
    await submitFinal(answer);
  };

  if (isListLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-green" />
        <p className="text-sm text-gray-400 font-medium">Loading…</p>
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3 text-center px-6">
        <AlertCircle className="w-10 h-10 text-red-300" />
        <p className="text-base font-bold text-gray-700">Assignment not found </p>
        <button
          onClick={() => navigate('/assignments')}
          className="mt-2 text-sm font-semibold text-primary-green hover:underline"
        >
          Assignments list par wapis jayein
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto pb-8 space-y-4">
      <button
        onClick={() => navigate('/assignments')}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Assignments
      </button>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 bg-gradient-to-r from-green-600 to-green-500">
          <h2 className="text-white font-bold text-base">{assignment.heading}</h2>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex flex-wrap gap-1.5">
            {assignment.course && (
              <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-md">
                <BookOpen className="w-3 h-3 text-blue-400" />
                {parsed ? parsed.subject : assignment.course}
              </span>
            )}
            {parsed?.cls && (
              <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-md">
                <Users className="w-3 h-3 text-violet-400" />
                {parsed.cls}
              </span>
            )}
            <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-md">
              <Calendar className="w-3 h-3 text-gray-400" />
              {format(parseISO(assignment.creation), 'd MMM yyyy')}
            </span>
          </div>

          <p className="text-sm text-gray-600 whitespace-pre-line leading-relaxed">
            {assignment.description}
          </p>

          <div className="border-t border-gray-50 pt-4 space-y-3">
            {submission && (
              <span className={cn('inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full', statusStyles[submission.status])}>
                {submission.status === 'Graded' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                {submission.status}
              </span>
            )}

            {isSubLoading ? (
              <div className="flex items-center justify-center py-10">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-green" />
              </div>
            ) : (
              <>
                <textarea
                  value={answer}
                  onChange={e => setAnswer(e.target.value)}
                  disabled={locked}
                  rows={6}
                  placeholder="Apna jawab yahan likhein…"
                  className={cn(
                    'w-full rounded-xl border border-gray-100 p-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-green/30 resize-none',
                    locked && 'bg-gray-50 text-gray-400'
                  )}
                />

                {submission?.status === 'Graded' && submission.gradedby && (
                  <p className="text-xs text-gray-400">Graded by: {submission.gradedby}</p>
                )}

                {error && (
                  <div className="flex items-center gap-2 text-red-600 text-xs bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {error}
                  </div>
                )}

                {!locked && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => answer.trim() && saveDraft(answer)}
                      disabled={isSaving || !answer.trim()}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" /> Save Draft
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={isSaving || !answer.trim()}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-primary-green text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50"
                    >
                      <Send className="w-4 h-4" /> Submit
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};