// hooks/useAssignments.ts
import { useEffect, useState } from 'react';
import { useUser } from '../context/UserContext';
import { erpService, AssignmentDetail } from '../services/erpService';

export type AcademicAssignment = AssignmentDetail;

interface UseAssignmentsReturn {
  assignments: AcademicAssignment[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export const useAssignments = (): UseAssignmentsReturn => {
  const { user, role, activeStudentId } = useUser();
  const isGuardian = role === 'guardian';

  const studentId: string | undefined = isGuardian
    ? (activeStudentId ?? undefined)
    : (activeStudentId ?? user?.name ?? undefined);

  const [assignments, setAssignments] = useState<AcademicAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trigger, setTrigger] = useState(0);

  useEffect(() => {
    if (!studentId) {
      setIsLoading(false);
      return;
    }

    const fetchAssignments = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Scoped via the student's actual enrolled courses
        // (see erpService.getAcademicAssignments).
        const data = await erpService.getAcademicAssignments(studentId);
        setAssignments(data);
      } catch (err: any) {
        setError(err?.response?.data?.message || err?.message || 'Failed to fetch assignments');
        setAssignments([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAssignments();
  }, [studentId, trigger]);

  return {
    assignments,
    isLoading,
    error,
    refetch: () => setTrigger(t => t + 1),
  };
};