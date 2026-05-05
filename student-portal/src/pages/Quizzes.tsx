import React, { useEffect, useState } from 'react';
import { useUser } from '../context/UserContext';
import { erpService } from '../services/erpService';
import { Quiz } from '../types';
import { BrainCircuit, Play, CheckCircle2, Clock, Trophy } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../lib/utils';

export const QuizzesPage: React.FC = () => {
  const { user } = useUser();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchQuizzes = async () => {
      if (!user) return;
      try {
        const data = await erpService.getQuizzes(user.name);
        setQuizzes(data || []);
      } catch (error) {
        console.error('Failed to fetch quizzes:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchQuizzes();
  }, [user]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Available Quizzes</h2>
        <div className="flex items-center gap-2 text-sm text-gray-500 bg-white px-4 py-2 rounded-xl border border-gray-100">
          <Trophy className="w-4 h-4 text-amber-500" />
          <span className="font-bold text-gray-900">{quizzes.filter(q => q.status === 'Completed').length}</span> Completed
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {isLoading ? (
          [1, 2, 3, 4].map(i => (
            <div key={i} className="h-48 bg-white rounded-3xl border border-gray-100 animate-pulse"></div>
          ))
        ) : quizzes.map((quiz) => (
          <div key={quiz.name} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between mb-4">
                <div className={cn(
                  "p-3 rounded-2xl",
                  quiz.status === 'Completed' ? "bg-emerald-50 text-emerald-600" : "bg-indigo-50 text-indigo-600"
                )}>
                  <BrainCircuit className="w-6 h-6" />
                </div>
                <span className={cn(
                  "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                  quiz.status === 'Completed' ? "bg-emerald-100 text-emerald-700" : "bg-indigo-100 text-indigo-700"
                )}>
                  {quiz.status}
                </span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">{quiz.quiz_name}</h3>
              <div className="flex items-center gap-3 text-sm text-gray-400">
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {format(new Date(quiz.date), 'MMM dd, yyyy')}
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
                <div className="text-xs text-gray-400">Estimated: 15 mins</div>
              )}
              
              <button className={cn(
                "flex items-center gap-2 px-6 py-2 rounded-xl font-bold transition-all",
                quiz.status === 'Completed' 
                  ? "bg-gray-50 text-gray-400 cursor-default" 
                  : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-100"
              )}>
                {quiz.status === 'Completed' ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Review
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    Start Quiz
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
        {!isLoading && quizzes.length === 0 && (
          <div className="md:col-span-2 bg-white p-12 rounded-3xl border border-gray-100 text-center text-gray-400">
            <BrainCircuit className="w-16 h-16 mx-auto mb-4 opacity-10" />
            <p className="text-lg font-medium">No quizzes scheduled</p>
          </div>
        )}
      </div>
    </div>
  );
};
