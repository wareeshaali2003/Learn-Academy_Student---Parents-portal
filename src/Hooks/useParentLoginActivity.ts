// hooks/useParentLoginActivity.ts
// Parent Portal ke liye — child (student) ki login activity fetch karta hai
import { useEffect, useState, useMemo } from 'react';
import { useUser } from '../context/UserContext';
import { resourceClient } from '../services/erpService';

export interface ParentActivityLogRecord {
  name: string;
  user: string;
  full_name: string;
  operation: 'Login' | 'Logout';
  status: string;
  subject: string;
  communication_date: string;
  ip_address: string;
}

export type ParentSessionStatus = 'Completed' | 'Active' | 'No logout recorded' | 'Orphan logout';

export interface ParentLoginSession {
  key: string;
  loginTime: Date | null;
  logoutTime: Date | null;
  durationMs: number | null;
  status: ParentSessionStatus;
  ipAddress?: string;
}

interface UseParentLoginActivityReturn {
  sessions: ParentLoginSession[];
  isLoading: boolean;
  error: string | null;
  isCurrentlyOnline: boolean;
  lastLogin: Date | null;
  lastLogout: Date | null;
  totalSessionsCount: number;
  totalTimeTodayMs: number;
  averageSessionMs: number;
  studentName: string | null;   // ← Parent Portal ke liye extra
  refetch: () => void;
}

function parseFrappeDate(value: string): Date {
  return new Date(value.replace(' ', 'T'));
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function buildSessions(records: ParentActivityLogRecord[]): ParentLoginSession[] {
  const sessions: ParentLoginSession[] = [];
  let openLogin: ParentActivityLogRecord | null = null;

  for (const record of records) {
    const eventTime = parseFrappeDate(record.communication_date);

    if (record.operation === 'Login') {
      if (openLogin) {
        sessions.push({
          key: openLogin.name,
          loginTime: parseFrappeDate(openLogin.communication_date),
          logoutTime: null,
          durationMs: null,
          status: 'No logout recorded',
          ipAddress: openLogin.ip_address,
        });
      }
      openLogin = record;
    } else if (record.operation === 'Logout') {
      if (openLogin) {
        const loginTime = parseFrappeDate(openLogin.communication_date);
        sessions.push({
          key: openLogin.name,
          loginTime,
          logoutTime: eventTime,
          durationMs: eventTime.getTime() - loginTime.getTime(),
          status: 'Completed',
          ipAddress: openLogin.ip_address,
        });
        openLogin = null;
      } else {
        sessions.push({
          key: record.name,
          loginTime: null,
          logoutTime: eventTime,
          durationMs: null,
          status: 'Orphan logout',
          ipAddress: record.ip_address,
        });
      }
    }
  }

  if (openLogin) {
    const loginTime = parseFrappeDate(openLogin.communication_date);
    sessions.push({
      key: openLogin.name,
      loginTime,
      logoutTime: null,
      durationMs: Date.now() - loginTime.getTime(),
      status: 'Active',
      ipAddress: openLogin.ip_address,
    });
  }

  return sessions.reverse();
}

export const useParentLoginActivity = (): UseParentLoginActivityReturn => {
  const { activeStudentId } = useUser();

  const [sessions, setSessions] = useState<ParentLoginSession[]>([]);
  const [studentName, setStudentName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trigger, setTrigger] = useState(0);

  useEffect(() => {
    const fetchParentLoginActivity = async () => {
      setIsLoading(true);
      setError(null);

      try {
        if (!activeStudentId) {
          setSessions([]);
          setStudentName(null);
          setIsLoading(false);
          return;
        }

        // ── STEP 1: Active student ka email + naam nikalo ───────────────
        let studentEmail: string | undefined;
        try {
          const studentRes: any = await resourceClient.get(
            `Student/${encodeURIComponent(activeStudentId)}`,
            {
              params: {
                fields: JSON.stringify(['name', 'student_name', 'student_email_id']),
              },
            }
          );
          studentEmail = studentRes?.data?.student_email_id;
          setStudentName(studentRes?.data?.student_name || null);

          console.log('[useParentLoginActivity] Student:', {
            id: activeStudentId,
            name: studentRes?.data?.student_name,
            email: studentEmail,
          });
        } catch (err) {
          console.warn('[useParentLoginActivity] Student fetch failed:', err);
        }

        if (!studentEmail) {
          console.warn('[useParentLoginActivity] Student email not set — cannot fetch activity');
          setSessions([]);
          setIsLoading(false);
          return;
        }

        // ── STEP 2: Student ke email se Activity Log fetch karo ─────────
        const response: any = await resourceClient.get('Activity Log', {
          params: {
            filters: JSON.stringify([
              ['user', '=', studentEmail],
              ['operation', 'in', ['Login', 'Logout']],
              ['status', '=', 'Success'],
            ]),
            fields: JSON.stringify([
              'name', 'user', 'full_name', 'operation',
              'status', 'subject', 'communication_date', 'ip_address',
            ]),
            order_by: 'communication_date asc',
            limit_page_length: 0,
          },
        });

        const records: ParentActivityLogRecord[] = response.data || [];
        setSessions(buildSessions(records));
      } catch (err: any) {
        setError(
          err?.response?.data?.message ||
            err?.message ||
            "Failed to fetch child's login activity"
        );
        setSessions([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchParentLoginActivity();
  }, [activeStudentId, trigger]);

  const derived = useMemo(() => {
    const today = new Date();
    const completedOrActive = sessions.filter((s) => s.durationMs !== null);

    const totalTimeTodayMs = completedOrActive
      .filter((s) => s.loginTime && isSameDay(s.loginTime, today))
      .reduce((sum, s) => sum + (s.durationMs || 0), 0);

    const averageSessionMs = completedOrActive.length
      ? completedOrActive.reduce((sum, s) => sum + (s.durationMs || 0), 0) /
        completedOrActive.length
      : 0;

    const lastLogin = sessions.find((s) => s.loginTime)?.loginTime || null;
    const lastLogout = sessions.find((s) => s.logoutTime)?.logoutTime || null;
    const isCurrentlyOnline = sessions.some((s) => s.status === 'Active');

    return {
      totalTimeTodayMs,
      averageSessionMs,
      lastLogin,
      lastLogout,
      isCurrentlyOnline,
    };
  }, [sessions]);

  return {
    sessions,
    isLoading,
    error,
    isCurrentlyOnline: derived.isCurrentlyOnline,
    lastLogin: derived.lastLogin,
    lastLogout: derived.lastLogout,
    totalSessionsCount: sessions.length,
    totalTimeTodayMs: derived.totalTimeTodayMs,
    averageSessionMs: derived.averageSessionMs,
    studentName,
    refetch: () => setTrigger((t) => t + 1),
  };
};

// Duration formatting (same as student hook)
export function formatParentDuration(ms: number | null): string {
  if (ms === null || ms < 0) return '—';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}