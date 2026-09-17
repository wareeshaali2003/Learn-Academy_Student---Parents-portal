// pages/AttendancePage.tsx
import React, { useState } from 'react';
import { useAttendance } from '../Hooks/useAttendance';
import { useUser } from '../context/UserContext';
import { format, parseISO } from 'date-fns';
import {
  CheckCircle2, XCircle, MinusCircle, AlertCircle,
  TrendingUp, Clock, BookOpen, Users,
} from 'lucide-react';
import { cn } from '../lib/utils';

type FilterType = 'All' | 'Present' | 'Absent' | 'On Leave';

function parseCourseCode(code: string): { cls: string; section: string | null; subject: string } | null {
  if (!code) return null;
  const withSection = code.match(/^[A-Z]+-([^-]+)-([A-Z])-([A-Za-z]+)\d+$/);
  if (withSection) return { cls: withSection[1], section: withSection[2], subject: withSection[3] };
  const withoutSection = code.match(/^[A-Z]+-([^-]+)-([A-Za-z]+)\d+$/);
  if (withoutSection) return { cls: withoutSection[1], section: null, subject: withoutSection[2] };
  return null;
}

const StatCard: React.FC<{
  icon: React.ReactNode;
  iconClass: string;
  label: string;
  value: number;
  total?: number;
}> = ({ icon, iconClass, label, value, total }) => (
  <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
    <div className={cn('p-3 rounded-xl flex-shrink-0', iconClass)}>{icon}</div>
    <div className="min-w-0">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-extrabold text-gray-900 leading-tight">{value}</p>
      {total !== undefined && (
        <div className="mt-1.5 h-1.5 bg-gray-100 rounded-full overflow-hidden w-24">
          <div
            className={cn('h-full rounded-full transition-all duration-700',
              iconClass.includes('emerald') ? 'bg-emerald-500' :
              iconClass.includes('red')     ? 'bg-red-400' : 'bg-amber-400'
            )}
            style={{ width: total > 0 ? `${(value / total) * 100}%` : '0%' }}
          />
        </div>
      )}
    </div>
  </div>
);

function StatusBadge({ status }: { status: string }) {
  if (status === 'Present')
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full whitespace-nowrap">
        <CheckCircle2 className="w-3 h-3" /> Present
      </span>
    );
  if (status === 'Absent')
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-red-50 text-red-600 px-2.5 py-1 rounded-full whitespace-nowrap">
        <XCircle className="w-3 h-3" /> Absent
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-amber-50 text-amber-600 px-2.5 py-1 rounded-full whitespace-nowrap">
      <MinusCircle className="w-3 h-3" /> On Leave
    </span>
  );
}

function InfoPill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-md">
      {icon}
      <span className="font-medium truncate max-w-[120px]">{label}</span>
    </span>
  );
}

export const AttendancePage: React.FC = () => {
  const { role, activeStudentId } = useUser();
  const { attendance, isLoading, error } = useAttendance();
  const [listFilter, setListFilter] = useState<FilterType>('All');

  if (role === 'guardian' && !activeStudentId) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3 text-center px-6">
        <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mb-2">
          <Users className="w-7 h-7 text-blue-400" />
        </div>
        <p className="text-base font-bold text-gray-700">No student is selected</p>
        <p className="text-sm text-gray-400 max-w-xs">
          Select a student from the menu above to view their attendance.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-green" />
        <p className="text-sm text-gray-400 font-medium">Loading attendance…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-3 p-4 bg-red-50 text-red-700 rounded-2xl border border-red-100">
        <AlertCircle className="w-5 h-5 flex-shrink-0" />
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  const total = attendance.length;
  const stats = {
    present: attendance.filter(a => a.status === 'Present').length,
    absent:  attendance.filter(a => a.status === 'Absent').length,
    leave:   attendance.filter(a => a.status === 'On Leave').length,
  };

  const sortedAttendance = [...attendance].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const filteredList = listFilter === 'All'
    ? sortedAttendance
    : sortedAttendance.filter(a => a.status === listFilter);

  return (
    <div className="space-y-5 max-w-4xl pb-8">

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={<CheckCircle2 className="w-5 h-5" />} iconClass="bg-emerald-50 text-emerald-600" label="Present" value={stats.present} total={total} />
        <StatCard icon={<XCircle className="w-5 h-5" />}      iconClass="bg-red-50 text-red-500"         label="Absent"  value={stats.absent}  total={total} />
        <StatCard icon={<MinusCircle className="w-5 h-5" />}  iconClass="bg-amber-50 text-amber-500"     label="On Leave" value={stats.leave}  total={total} />
      </div>

      {/* Attendance Rate Banner */}
      {total > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary-green" />
              <span className="text-sm font-bold text-gray-700">Attendance Rate</span>
            </div>
            <span className={cn(
              'text-sm font-extrabold px-3 py-1 rounded-full',
              stats.present / total >= 0.75 ? 'bg-emerald-50 text-emerald-700' :
              stats.present / total >= 0.5  ? 'bg-amber-50 text-amber-600' :
              'bg-red-50 text-red-600'
            )}>
              {Math.round((stats.present / total) * 100)}%
            </span>
          </div>
          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-700',
                stats.present / total >= 0.75 ? 'bg-emerald-500' :
                stats.present / total >= 0.5  ? 'bg-amber-400' : 'bg-red-500'
              )}
              style={{ width: `${(stats.present / total) * 100}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-gray-400 font-medium mt-2">
            <span>{stats.present} present out of {total} total classes</span>
            <span>{stats.absent} absent · {stats.leave} on leave</span>
          </div>
        </div>
      )}

      {/* List View */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex gap-1 p-3 border-b border-gray-50 bg-gray-50/50">
          {(['All', 'Present', 'Absent', 'On Leave'] as const).map(f => (
            <button
              key={f}
              onClick={() => setListFilter(f)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                listFilter === f
                  ? f === 'All'      ? 'bg-gray-800 text-white' :
                    f === 'Present'  ? 'bg-emerald-500 text-white' :
                    f === 'Absent'   ? 'bg-red-500 text-white' :
                                       'bg-amber-500 text-white'
                  : 'text-gray-500 hover:bg-white hover:text-gray-700'
              )}
            >
              {f}
              {f !== 'All' && (
                <span className="ml-1.5 opacity-70">
                  {f === 'Present' ? stats.present : f === 'Absent' ? stats.absent : stats.leave}
                </span>
              )}
            </button>
          ))}
          <span className="ml-auto text-xs text-gray-400 font-medium self-center pr-1">
            {filteredList.length} records
          </span>
        </div>

        {filteredList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
            <Clock className="w-8 h-8 opacity-40" />
            <p className="text-sm font-medium">No records found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filteredList.map((record, i) => {
              const date = parseISO(record.date);
              const parsed = parseCourseCode(record.course_schedule);

              return (
                <div key={i} className="flex items-start justify-between px-5 py-4 hover:bg-gray-50/50 transition-colors gap-4">
                  <div className="flex items-start gap-4 min-w-0">
                    <div className={cn(
                      'w-12 h-12 rounded-xl flex flex-col items-center justify-center flex-shrink-0 border',
                      record.status === 'Present'  ? 'bg-emerald-50 border-emerald-100 text-emerald-700' :
                      record.status === 'Absent'   ? 'bg-red-50 border-red-100 text-red-600' :
                      'bg-amber-50 border-amber-100 text-amber-600'
                    )}>
                      <span className="text-base font-extrabold leading-none">{format(date, 'd')}</span>
                      <span className="text-[9px] font-semibold uppercase tracking-wide opacity-70">{format(date, 'MMM')}</span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-gray-800 mb-2">
                        {format(date, 'EEEE, d MMM yyyy')}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {record.course_schedule && (
                          <InfoPill
                            icon={<BookOpen className="w-3 h-3 text-blue-400" />}
                            label={parsed ? parsed.subject : record.course_schedule}
                          />
                        )}
                        {record.student_group && (
                          <InfoPill
                            icon={<Users className="w-3 h-3 text-violet-400" />}
                            label={record.student_group.replace(/^LB-/, '')}
                          />
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex-shrink-0 pt-0.5">
                    <StatusBadge status={record.status} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendancePage;