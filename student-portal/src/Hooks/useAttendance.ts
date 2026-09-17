// hooks/useAttendance.ts
import { useEffect, useState } from 'react';
import { useUser } from '../context/UserContext';
import { resourceClient } from '../services/erpService';

export interface AttendanceRecord {
  name: string;
  student: string;
  student_name: string;
  course_schedule: string;
  student_group: string;
  date: string;
  status: 'Present' | 'Absent' | 'On Leave';
  link_nvfk: string;
}

interface UseAttendanceReturn {
  attendance: AttendanceRecord[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export const useAttendance = (): UseAttendanceReturn => {
  const { user, role, activeStudentId } = useUser();

  const isGuardian = role === 'guardian';
  const studentId: string | undefined = isGuardian
    ? (activeStudentId ?? undefined)
    : (activeStudentId ?? user?.name ?? undefined);

  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trigger, setTrigger] = useState(0);

  useEffect(() => {
    if (!studentId) {
      setIsLoading(false);
      return;
    }

    const fetchAttendance = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Fetch attendance records
        const response: any = await resourceClient.get('Student Attendance', {
          params: {
            filters: JSON.stringify([['student', '=', studentId]]),
            fields: JSON.stringify([
              'name', 'student', 'student_name', 'course_schedule',
              'student_group', 'date', 'status', 'link_nvfk'
            ]),
            limit_page_length: 500,
            order_by: 'date desc',
          },
        });

        const allAttendance: AttendanceRecord[] = response.data || [];
        setAttendance(allAttendance);
        console.log(`✅ Attendance loaded: ${allAttendance.length} records`);
      } catch (err: any) {
        setError(err?.response?.data?.message || err?.message || 'Failed to fetch attendance');
        setAttendance([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAttendance();
  }, [studentId, trigger]);

  return {
    attendance,
    isLoading,
    error,
    refetch: () => setTrigger(t => t + 1),
  };
};