import React, { useEffect, useState } from 'react';
import { useUser } from '../context/UserContext';
import { erpService } from '../services/erpService';
import { Result } from '../types';
import { GraduationCap, Award, BookOpen } from 'lucide-react';

// ── Course Code Parser ────────────────────────────────────────────────────────
// Parses "LB-KG1-A-Math00001" → { cls: "KG1", section: "A", subject: "Math" }
// Parses "LB-KG1-Math00001"   → { cls: "KG1", section: null, subject: "Math" }

function parseCourseCode(code: string): { cls: string; section: string | null; subject: string } | null {
  if (!code) return null;

  // With section: LB-KG1-A-Math00001
  const withSection = code.match(/^[A-Z]+-([^-]+)-([A-Z])-([A-Za-z]+)\d+$/);
  if (withSection) {
    return { cls: withSection[1], section: withSection[2], subject: withSection[3] };
  }

  // Without section: LB-KG1-Math00001
  const withoutSection = code.match(/^[A-Z]+-([^-]+)-([A-Za-z]+)\d+$/);
  if (withoutSection) {
    return { cls: withoutSection[1], section: null, subject: withoutSection[2] };
  }

  return null;
}

function formatCourseLabel(code: string): string {
  const parsed = parseCourseCode(code);
  if (!parsed) return code; // fallback to raw
  const parts = [parsed.cls];
  if (parsed.section) parts.push(parsed.section);
  parts.push(parsed.subject);
  return parts.join(' · '); // e.g. "KG1 · A · Math"
}

// ── Results Page ──────────────────────────────────────────────────────────────

export const ResultsPage: React.FC = () => {
 const { studentId } = useUser();
  const [results, setResults] = useState<Result[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchResults = async () => {
      if (!studentId ) return;
      try {
        const data = await erpService.getResults(studentId );
        setResults(data || []);
      } catch (error) {
        console.error('Failed to fetch results:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchResults();
  }, [studentId ]);

  const highestPercentage = results.length > 0
    ? Math.max(...results.map(r => {
        const max = r.maximum_score || r.total_weightage || 0;
        return max > 0 ? (r.total_score / max) * 100 : r.total_score || 0;
      })).toFixed(1)
    : '0.0';

  return (
    <div className="space-y-8">
      <div className="bg-indigo-600 rounded-3xl p-8 text-white relative overflow-hidden shadow-xl shadow-indigo-200">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="text-3xl font-bold mb-2">Academic Performance</h2>
            <p className="text-indigo-100">Your overall progress and assessment results</p>
          </div>
          <div className="flex gap-8">
            <div className="text-center">
              <p className="text-indigo-200 text-sm mb-1">Highest</p>
              <p className="text-4xl font-bold">{highestPercentage}%</p>
            </div>
            <div className="text-center">
              <p className="text-indigo-200 text-sm mb-1">Assessments</p>
              <p className="text-4xl font-bold">{results.length}</p>
            </div>
          </div>
        </div>
        <div className="absolute -right-10 -bottom-10 opacity-10">
          <GraduationCap className="w-64 h-64" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {isLoading ? (
          [1, 2].map(i => (
            <div key={i} className="h-32 bg-white rounded-3xl border border-gray-100 animate-pulse"></div>
          ))
        ) : results.map((result) => (
          <div key={result.name} className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center text-indigo-600">
                  <BookOpen className="w-8 h-8" />
                </div>
                <div>
                  {/* Clean label: "KG1 · A · Math" instead of "LB-KG1-A-Math00001" */}
                  <h3 className="text-xl font-bold text-gray-900">
                    {formatCourseLabel(result.assessment_plan)}
                  </h3>
                  <p className="text-gray-500">Final Assessment Result</p>
                </div>
              </div>
              <div className="flex items-center gap-12">
                <div className="text-right">
                  <p className="text-sm text-gray-400 mb-1">Score</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {result.total_score}{' '}
                    <span className="text-gray-300 text-lg">/ {result.maximum_score || result.total_weightage}</span>
                  </p>
                </div>
                <div className="w-16 h-16 rounded-full border-4 border-indigo-50 flex items-center justify-center">
                  <span className="text-2xl font-black text-indigo-600">{result.grade || 'A'}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
        {!isLoading && results.length === 0 && (
          <div className="bg-white p-12 rounded-3xl border border-gray-100 text-center text-gray-400">
            <Award className="w-16 h-16 mx-auto mb-4 opacity-10" />
            <p className="text-lg font-medium">No results published yet</p>
          </div>
        )}
      </div>
    </div>
  );
};