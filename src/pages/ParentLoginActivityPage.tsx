// pages/ParentLoginActivityPage.tsx
// Parent Portal ke liye — child (student) ki login activity dikhata hai
import React from 'react';
import { format } from 'date-fns';
import {
  useParentLoginActivity,
  formatParentDuration,
  ParentLoginSession,
  ParentSessionStatus,
} from '../Hooks/useParentLoginActivity';
import {
  LogIn,
  LogOut,
  Timer,
  History,
  RefreshCw,
  Radio,
  AlertTriangle,
  Baby,
} from 'lucide-react';
import { cn } from '../lib/utils';

const StatCard: React.FC<{
  icon: React.ReactNode;
  iconClass: string;
  label: string;
  value: string;
}> = ({ icon, iconClass, label, value }) => (
  <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
    <div className={cn('p-3 rounded-xl flex-shrink-0', iconClass)}>{icon}</div>
    <div className="min-w-0">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-extrabold text-gray-900 leading-tight">{value}</p>
    </div>
  </div>
);

function StatusBadge({ status }: { status: ParentSessionStatus }) {
  switch (status) {
    case 'Active':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full whitespace-nowrap">
          <Radio className="w-3 h-3 animate-pulse" /> Active now
        </span>
      );
    case 'Completed':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full whitespace-nowrap">
          Completed
        </span>
      );
    case 'No logout recorded':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full whitespace-nowrap">
          <AlertTriangle className="w-3 h-3" /> No logout recorded
        </span>
      );
    case 'Orphan logout':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full whitespace-nowrap">
          <AlertTriangle className="w-3 h-3" /> Login not found
        </span>
      );
  }
}

function SessionRow({ session }: { session: ParentLoginSession }) {
  const dateLabel = session.loginTime
    ? format(session.loginTime, 'dd MMM yyyy')
    : session.logoutTime
    ? format(session.logoutTime, 'dd MMM yyyy')
    : '—';

  return (
    <tr className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors">
      <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{dateLabel}</td>
      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
        {session.loginTime ? format(session.loginTime, 'hh:mm a') : '—'}
      </td>
      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
        {session.logoutTime ? format(session.logoutTime, 'hh:mm a') : '—'}
      </td>
      <td className="px-4 py-3 text-sm font-semibold text-gray-900 whitespace-nowrap">
        {formatParentDuration(session.durationMs)}
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={session.status} />
      </td>
    </tr>
  );
}

export const ParentLoginActivityPage: React.FC = () => {
  const {
    sessions,
    isLoading,
    error,
    isCurrentlyOnline,
    lastLogin,
    lastLogout,
    totalSessionsCount,
    totalTimeTodayMs,
    averageSessionMs,
    studentName,
    refetch,
  } = useParentLoginActivity();

  const displayName = studentName || 'Your Child';
  const firstName = displayName.split(' ')[0] || displayName;

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Baby className="w-5 h-5 text-indigo-600" />
            {displayName}'s Login Activity
          </h1>
          <p className="text-sm text-gray-500">
            Session history for {displayName}, sourced from Activity Log
          </p>
        </div>
        <button
          onClick={refetch}
          className="flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700 px-3 py-2 rounded-lg hover:bg-indigo-50 transition-colors"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* ── Stat Cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={
            <Radio
              className={cn(
                'w-5 h-5',
                isCurrentlyOnline ? 'text-emerald-600' : 'text-gray-400'
              )}
            />
          }
          iconClass={isCurrentlyOnline ? 'bg-emerald-50' : 'bg-gray-100'}
          label={`${firstName} is ${isCurrentlyOnline ? 'Online' : 'Offline'}`}
          value={isCurrentlyOnline ? 'Online' : 'Offline'}
        />
        <StatCard
          icon={<Timer className="w-5 h-5 text-indigo-600" />}
          iconClass="bg-indigo-50"
          label="Active Today"
          value={formatParentDuration(totalTimeTodayMs)}
        />
        <StatCard
          icon={<History className="w-5 h-5 text-amber-600" />}
          iconClass="bg-amber-50"
          label="Avg. Session"
          value={formatParentDuration(averageSessionMs)}
        />
        <StatCard
          icon={<LogIn className="w-5 h-5 text-gray-600" />}
          iconClass="bg-gray-100"
          label="Total Sessions"
          value={String(totalSessionsCount)}
        />
      </div>

      {/* ── Last Login/Logout Summary ───────────────────────────────── */}
      {lastLogin && (
        <p className="text-sm text-gray-500">
          Last login:{' '}
          <span className="font-medium text-gray-700">
            {format(lastLogin, 'dd MMM yyyy, hh:mm a')}
          </span>
          {lastLogout && (
            <>
              {' '}· Last logout:{' '}
              <span className="font-medium text-gray-700">
                {format(lastLogout, 'dd MMM yyyy, hh:mm a')}
              </span>
            </>
          )}
        </p>
      )}

      {/* ── Sessions Table ──────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          /* Loading */
          <div className="p-10 flex justify-center">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          /* Error */
          <div className="p-6 text-sm text-red-600">{error}</div>
        ) : sessions.length === 0 ? (
          /* Beautiful Empty State */
          <div className="p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
              <History className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-sm font-semibold text-gray-600 mb-1">
              No activity yet
            </p>
            <p className="text-xs text-gray-400 max-w-xs mx-auto">
              {displayName} hasn't logged in to the Student Portal yet.
            </p>
          </div>
        ) : (
          /* Table */
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    <span className="inline-flex items-center gap-1">
                      <LogIn className="w-3.5 h-3.5" /> Login
                    </span>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    <span className="inline-flex items-center gap-1">
                      <LogOut className="w-3.5 h-3.5" /> Logout
                    </span>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Duration
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((session) => (
                  <SessionRow key={session.key} session={session} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ParentLoginActivityPage;