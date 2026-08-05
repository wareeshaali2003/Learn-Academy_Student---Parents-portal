import React, { useEffect, useState } from 'react';
import { useUser } from '../context/UserContext';
import { erpService } from '../services/erpService';
import { Assignment } from '../types';
import { format } from 'date-fns';
import { FileText, Clock, CheckCircle2, AlertCircle, Search, GraduationCap } from 'lucide-react';
import { cn } from '../lib/utils';

export const AssignmentsPage: React.FC = () => {
  const { user } = useUser();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'All' | 'Pending' | 'Submitted' | 'Evaluated'>('All');

  useEffect(() => {
    const fetchAssignments = async () => {
      if (!user) return;
      try {
        const data = await erpService.getAssignments(user.name);
        setAssignments(data || []);
      } catch (error) {
        console.error('Failed to fetch assignments:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAssignments();
  }, [user]);

  const filteredAssignments = assignments.filter(a => filter === 'All' || a.status === filter);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search assignments..." 
            className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
          {['All', 'Pending', 'Submitted', 'Evaluated'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f as any)}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all",
                filter === f 
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100" 
                  : "bg-white text-gray-500 border border-gray-200 hover:bg-gray-50"
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {isLoading ? (
          [1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-white rounded-3xl border border-gray-100 animate-pulse"></div>
          ))
        ) : filteredAssignments.map((assignment) => (
          <div key={assignment.name} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all group">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className={cn(
                  "p-3 rounded-2xl",
                  assignment.status === 'Pending' ? "bg-amber-50 text-amber-600" :
                  assignment.status === 'Submitted' ? "bg-blue-50 text-blue-600" :
                  "bg-emerald-50 text-emerald-600"
                )}>
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-gray-900 group-hover:text-indigo-600 transition-colors">
                    {assignment.assignment_name}
                  </h3>
                  <div className="flex flex-wrap items-center gap-4 mt-1">
                    <div className="flex items-center gap-1.5 text-sm text-gray-500">
                      <Clock className="w-4 h-4" />
                      Due {format(new Date(assignment.due_date), 'MMM dd, yyyy')}
                    </div>
                    {assignment.marks_obtained !== undefined && (
                      <div className="flex items-center gap-1.5 text-sm font-bold text-indigo-600">
                        <GraduationCap className="w-4 h-4" />
                        Score: {assignment.marks_obtained}/{assignment.total_marks}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between md:justify-end gap-4">
                <span className={cn(
                  "px-4 py-1.5 rounded-full text-xs font-bold",
                  assignment.status === 'Pending' ? "bg-amber-100 text-amber-700" :
                  assignment.status === 'Submitted' ? "bg-blue-100 text-blue-700" :
                  "bg-emerald-100 text-emerald-700"
                )}>
                  {assignment.status}
                </span>
                <button className="p-2 hover:bg-gray-50 rounded-xl border border-gray-100 transition-colors">
                  <ArrowRight className="w-5 h-5 text-gray-400" />
                </button>
              </div>
            </div>
          </div>
        ))}
        {!isLoading && filteredAssignments.length === 0 && (
          <div className="bg-white p-12 rounded-3xl border border-gray-100 text-center text-gray-400">
            <FileText className="w-16 h-16 mx-auto mb-4 opacity-10" />
            <p className="text-lg font-medium">No assignments found for this filter</p>
          </div>
        )}
      </div>
    </div>
  );
};

const ArrowRight = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);
