// hooks/useLoginActivity.ts
// ✅ Role-based: Student → apni, Parent → child ki activity
import { useEffect, useState, useMemo } from 'react';
import { useUser } from '../context/UserContext';
import { resourceClient, erpService } from '../services/erpService';

export interface ActivityLogRecord {
  name: string;
  user: string;
  full_name: string;
  operation: 'Login' | 'Logout';
  status: string;
  subject: string;
  communication_date: string;
  ip_address: string;
}

export type SessionStatus = 'Completed' | 'Active' | 'No logout recorded' | 'Orphan logout';

export interface LoginSession {
  key: string;
  loginTime: Date | null;
  logoutTime: Date | null;
  durationMs: number | null;
  status: SessionStatus;
  ipAddress?: string;
}

interface UseLoginActivityReturn {
  sessions: LoginSession[];
  isLoading: boolean;
  error: string | null;
  isCurrentlyOnline: boolean;
  lastLogin: Date | null;
  lastLogout: Date | null;
  totalSessionsCount: number;
  totalTimeTodayMs: number;
  averageSessionMs: number;
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

function buildSessions(records: ActivityLogRecord[]): LoginSession[] {
  const sessions: LoginSession[] = [];
  let openLogin: ActivityLogRecord | null = null;

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

export const useLoginActivity = (): UseLoginActivityReturn => {
  const { user, role, activeStudentId } = useUser();

  const [sessions, setSessions] = useState<LoginSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trigger, setTrigger] = useState(0);

  useEffect(() => {
    const fetchLoginActivity = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // ✅ FIX: Role-based logic
        let frappeUserId: string | undefined;

        // ═══ PARENT PORTAL: Selected child ka email ═══
        if (role === 'guardian' && activeStudentId) {
          try {
            const studentRes: any = await resourceClient.get(
              `Student/${encodeURIComponent(activeStudentId)}`,
              { params: { fields: JSON.stringify(['student_email_id']) } }
            );
            frappeUserId = studentRes?.data?.student_email_id;
            console.log('[useLoginActivity] Guardian mode → child email:', frappeUserId);
          } catch (err) {
            console.warn('[useLoginActivity] Child email fetch failed:', err);
          }
        }

        // ═══ STUDENT PORTAL or fallback: current user ═══
        if (!frappeUserId) {
          const profile = await erpService.getProfile();
          if (profile.ok && typeof profile.data === 'string') {
            frappeUserId = profile.data;
          } else {
            frappeUserId =
              (user as any)?.student_email_id ||
              (user as any)?.email ||
              (user as any)?.email_address ||
              undefined;
          }
        }

        console.log('[useLoginActivity] Final frappeUserId:', frappeUserId);

        if (!frappeUserId) {
          setSessions([]);
          setIsLoading(false);
          return;
        }

        const response: any = await resourceClient.get('Activity Log', {
          params: {
            filters: JSON.stringify([
              ['user', '=', frappeUserId],
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

        const records: ActivityLogRecord[] = response.data || [];
        setSessions(buildSessions(records));
      } catch (err: any) {
        setError(err?.response?.data?.message || err?.message || 'Failed to fetch login activity');
        setSessions([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLoginActivity();
  }, [user, role, activeStudentId, trigger]);   // ← activeStudentId bhi dependency

  const derived = useMemo(() => {
    const today = new Date();
    const completedOrActive = sessions.filter((s) => s.durationMs !== null);

    const totalTimeTodayMs = completedOrActive
      .filter((s) => s.loginTime && isSameDay(s.loginTime, today))
      .reduce((sum, s) => sum + (s.durationMs || 0), 0);

    const averageSessionMs = completedOrActive.length
      ? completedOrActive.reduce((sum, s) => sum + (s.durationMs || 0), 0) / completedOrActive.length
      : 0;

    const lastLogin = sessions.find((s) => s.loginTime)?.loginTime || null;
    const lastLogout = sessions.find((s) => s.logoutTime)?.logoutTime || null;
    const isCurrentlyOnline = sessions.some((s) => s.status === 'Active');

    return { totalTimeTodayMs, averageSessionMs, lastLogin, lastLogout, isCurrentlyOnline };
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
    refetch: () => setTrigger((t) => t + 1),
  };
};

export function formatDuration(ms: number | null): string {
  if (ms === null || ms < 0) return '—';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}