// components/AssignmentSubmissionModal.tsx
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Send, Save, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { useAssignmentSubmission } from '../Hooks/useAssignmentSubmission';
import { cn } from '../lib/utils';

interface Props {
  assignmentId: string;
  heading: string;
  course: string;
  courseSchedule: string;
  onClose: () => void;
}

const statusStyles: Record<string, string> = {
  Draft: 'bg-gray-100 text-gray-600',
  Submitted: 'bg-blue-50 text-blue-700',
  Graded: 'bg-green-50 text-green-700',
};

export const AssignmentSubmissionModal: React.FC<Props> = ({
  assignmentId, heading, course, courseSchedule, onClose,
}) => {
  const { submission, isLoading, isSaving, error, saveDraft, submitFinal } =
    useAssignmentSubmission(assignmentId, course, courseSchedule);

  const [answer, setAnswer] = useState('');

  useEffect(() => {
    if (submission?.answer) setAnswer(submission.answer);
  }, [submission?.answer]);

  const locked = submission?.status === 'Submitted' || submission?.status === 'Graded';

  const handleSubmit = async () => {
    if (!answer.trim()) return;
    if (!window.confirm('Once submitted, the answer cannot be edited. Do you want to confirm?')) return;
    await submitFinal(answer);
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50 bg-gradient-to-r from-green-600 to-green-500">
          <h3 className="text-white font-bold text-sm truncate pr-2">{heading}</h3>
          <button onClick={onClose} className="text-white/90 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {submission && (
            <span className={cn('inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full', statusStyles[submission.status])}>
              {submission.status === 'Graded' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
              {submission.status}
            </span>
          )}

          {isLoading ? (
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
                placeholder="Write your answer here…"
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
            </>
          )}
        </div>

        {!locked && !isLoading && (
          <div className="flex gap-2 px-5 pb-5">
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
      </div>
    </div>,
    document.body
  );
};