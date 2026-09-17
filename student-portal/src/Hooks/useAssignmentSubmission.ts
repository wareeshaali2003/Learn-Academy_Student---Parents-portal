// hooks/useAssignmentSubmission.ts
import { useCallback, useEffect, useState } from 'react';
import { useUser } from '../context/UserContext';
import { erpService, AssignmentSubmission } from '../services/erpService';

interface UseAssignmentSubmissionReturn {
  submission: AssignmentSubmission | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  saveDraft: (answer: string) => Promise<void>;
  submitFinal: (answer: string) => Promise<void>;
  refetch: () => void;
}

export const useAssignmentSubmission = (
  assignmentId: string,
  course: string,
  courseSchedule: string
): UseAssignmentSubmissionReturn => {
  const { user, role, activeStudentId } = useUser();
  const isGuardian = role === 'guardian';

  const studentId: string | undefined = isGuardian
    ? (activeStudentId ?? undefined)
    : (activeStudentId ?? user?.name ?? undefined);

  const [submission, setSubmission] = useState<AssignmentSubmission | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trigger, setTrigger] = useState(0);

  useEffect(() => {
    if (!assignmentId || !studentId) {
      setIsLoading(false);
      return;
    }
    const fetchSubmission = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const existing = await erpService.getSubmissionForAssignment(assignmentId, studentId);
        setSubmission(existing);
      } catch (err: any) {
        setError(err?.response?.data?.message || err?.message || 'Failed to fetch submission');
        setSubmission(null);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSubmission();
  }, [assignmentId, studentId, trigger]);

  const persist = useCallback(
    async (answer: string, status: 'Draft' | 'Submitted') => {
      if (!studentId) return;
      setIsSaving(true);
      setError(null);
      try {
        const saved = await erpService.saveSubmission({
          name: submission?.name,
          assignment: assignmentId,
          assignmentstudent: studentId,
          course,
          courseschedule: courseSchedule,
          answer,
          status,
        });
        setSubmission(saved);
      } catch (err: any) {
        setError(err?.response?.data?.message || err?.message || 'Failed to save submission');
        throw err;
      } finally {
        setIsSaving(false);
      }
    },
    [assignmentId, course, courseSchedule, studentId, submission?.name]
  );

  return {
    submission,
    isLoading,
    isSaving,
    error,
    saveDraft: (answer: string) => persist(answer, 'Draft'),
    submitFinal: (answer: string) => persist(answer, 'Submitted'),
    refetch: () => setTrigger(t => t + 1),
  };
};