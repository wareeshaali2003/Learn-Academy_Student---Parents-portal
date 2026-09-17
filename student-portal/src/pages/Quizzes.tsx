import React, { useState } from 'react';
import { useUser } from '../context/UserContext';
import { useQuizzes } from '../Hooks/useQuizzes';
import { erpService, QuizDoc } from '../services/erpService';
import { BrainCircuit, CheckCircle2, Clock, Trophy, ListChecks, Eye, X } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../lib/utils';

export const QuizzesPage: React.FC = () => {
  const { user } = useUser();
  const { quizzes, isLoading } = useQuizzes(user?.name);

  const [selectedQuiz, setSelectedQuiz] = useState<QuizDoc | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  const handleViewQuestions = async (quizName: string) => {
    setIsDetailLoading(true);
    try {
      const detail = await erpService.getQuizDetail(quizName);
      setSelectedQuiz(detail);
    } catch (err) {
      console.error('[handleViewQuestions] error:', err);
    } finally {
      setIsDetailLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Available Quizzes</h2>
        <div className="flex items-center gap-2 text-sm text-gray-500 bg-white px-4 py-2 rounded-xl border border-gray-100">
          <Trophy className="w-4 h-4 text-amber-500" />
          <span className="font-bold text-gray-900">
            {quizzes.filter((q) => q.status === 'Completed').length}
          </span>{' '}
          Completed
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {isLoading ? (
          [1, 2, 3, 4].map((i) => (
            <div key={i} className="h-48 bg-white rounded-3xl border border-gray-100 animate-pulse"></div>
          ))
        ) : (
          quizzes.map((quiz) => (
            <div
              key={quiz.name}
              className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div
                    className={cn(
                      'p-3 rounded-2xl',
                      quiz.status === 'Completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'
                    )}
                  >
                    <BrainCircuit className="w-6 h-6" />
                  </div>
                  <span
                    className={cn(
                      'px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider',
                      quiz.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700'
                    )}
                  >
                    {quiz.status}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">{quiz.title}</h3>
                <div className="flex items-center gap-3 text-sm text-gray-400">
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {format(new Date(quiz.date), 'MMM dd, yyyy')}
                  </div>
                  <div className="flex items-center gap-1">
                    <ListChecks className="w-4 h-4" />
                    {quiz.question?.length ?? 0} Questions
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-50 flex items-center justify-between">
                {quiz.status === 'Completed' ? (
                  <div className="flex items-center gap-2">
                    <div className="text-xs text-gray-400">Your Score</div>
                    <div className="text-lg font-bold text-emerald-600">{quiz.score}%</div>
                  </div>
                ) : (
                  <div className="text-xs text-gray-400">
                    {quiz.is_time_bound ? `${Math.round(quiz.duration / 60)} mins` : 'No time limit'}
                    {' · '}Pass: {quiz.passing_score}%
                  </div>
                )}

                <button
                  onClick={() => handleViewQuestions(quiz.name)}
                  className="flex items-center gap-2 px-6 py-2 rounded-xl font-bold bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-all"
                >
                  <Eye className="w-4 h-4" />
                  View Questions
                </button>
              </div>
            </div>
          ))
        )}
        {!isLoading && quizzes.length === 0 && (
          <div className="md:col-span-2 bg-white p-12 rounded-3xl border border-gray-100 text-center text-gray-400">
            <BrainCircuit className="w-16 h-16 mx-auto mb-4 opacity-10" />
            <p className="text-lg font-medium">No quizzes scheduled</p>
          </div>
        )}
      </div>

      {/* ── Question View Modal ─────────────────────────────────────────── */}
      {(selectedQuiz || isDetailLoading) && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedQuiz(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">
                {isDetailLoading ? 'Loading...' : selectedQuiz?.title}
              </h3>
              <button
                onClick={() => setSelectedQuiz(null)}
                className="p-2 hover:bg-gray-50 rounded-xl"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {isDetailLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-gray-50 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {(selectedQuiz?.question ?? []).map((q, idx) => (
                  <div key={q.name} className="p-4 bg-gray-50 rounded-2xl">
                    <div className="text-xs font-bold text-indigo-600 mb-1">
                      Question {idx + 1}
                    </div>
                    <div
                      className="text-gray-900 text-sm"
                      dangerouslySetInnerHTML={{ __html: q.question }}
                    />
                  </div>
                ))}
                {(!selectedQuiz?.question || selectedQuiz.question.length === 0) && (
                  <p className="text-gray-400 text-sm">No questions added yet.</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};