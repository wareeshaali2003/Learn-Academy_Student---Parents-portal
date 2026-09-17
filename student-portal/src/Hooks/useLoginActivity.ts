// hooks/useLoginActivity.ts
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
  communication_date: string; // "YYYY-MM-DD HH:mm:ss.ffffff"
  ip_address: string;
}

export type SessionStatus = 'Completed' | 'Active' | 'No logout recorded' | 'Orphan logout';

export interface LoginSession {
  key: string;
  loginTime: Date | null;
  logoutTime: Date | null;
  durationMs: number | null; // null when it can't be determined (no logout recorded)
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

// Frappe stores "YYYY-MM-DD HH:mm:ss.ffffff" — normalize to a parseable ISO-ish string.
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

// Pairs raw Login/Logout Activity Log rows (already sorted oldest → newest)
// into sessions with a computed duration.
function buildSessions(records: ActivityLogRecord[]): LoginSession[] {
  const sessions: LoginSession[] = [];
  let openLogin: ActivityLogRecord | null = null;

  for (const record of records) {
    const eventTime = parseFrappeDate(record.communication_date);

    if (record.operation === 'Login') {
      // A login arrived while a previous login was still "open" —
      // the previous session never got a matching logout on record.
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
        // Logout with no login on record (e.g. login row fell outside the fetch window)
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

  // Student is still logged in — no logout yet.
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

  // Most recent first for display.
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
        // The Frappe "user" on an Activity Log is the login id (email) used at sign-in.
        // Resolve it from the live session first; fall back to whatever the portal has cached.
        let frappeUserId: string | undefined;
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
  }, [user, role, activeStudentId, trigger]);

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

// Formats a millisecond duration as "Xh Ym" / "Ym Zs" for display.
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
