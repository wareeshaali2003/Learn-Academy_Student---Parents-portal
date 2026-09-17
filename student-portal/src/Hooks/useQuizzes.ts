import { useEffect, useState, useCallback } from 'react';
import { erpService, QuizWithResult } from '../services/erpService';

export const useQuizzes = (studentName?: string) => {
  const [quizzes, setQuizzes] = useState<QuizWithResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchQuizzes = useCallback(async () => {
    if (!studentName) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const data = await erpService.getQuizzesWithResults(studentName);
      setQuizzes(data);
    } catch (err) {
      console.error('[useQuizzes] Failed to fetch quizzes:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [studentName]);

  useEffect(() => {
    fetchQuizzes();
  }, [fetchQuizzes]);

  return { quizzes, isLoading, error, refetch: fetchQuizzes };
};