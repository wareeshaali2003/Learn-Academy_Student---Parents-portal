import { useState, useEffect, useCallback } from 'react';
import { erpService } from '../services/erpService';

export type NoticeType = 'NEWS' | 'STREAM' | 'CIRCULAR';

export interface Notice {
  name: string;
  subject: string;
  message: string;
  type: NoticeType;
  creation: string;
  owner: string;
}

interface UseNoticeBoardReturn {
  notices: Notice[];
  filteredNotices: Notice[];
  activeFilter: NoticeType | 'ALL';
  isLoading: boolean;
  error: string | null;
  setActiveFilter: (filter: NoticeType | 'ALL') => void;
  refetch: () => void;
}

const normalizeType = (type: string): NoticeType => {
  const t = type?.toUpperCase().trim();
  if (t?.includes('STREAM')) return 'STREAM';
  if (t?.includes('CIRCULAR')) return 'CIRCULAR';
  if (t?.includes('NEWS')) return 'NEWS';
  return 'NEWS';
};

export function useNoticeBoard(): UseNoticeBoardReturn {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [activeFilter, setActiveFilter] = useState<NoticeType | 'ALL'>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotices = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await erpService.getNoticeBoard();
      const normalized = (data || []).map((n: any) => ({
        ...n,
        type: normalizeType(n.type),
      }));
      setNotices(normalized);
    } catch (err) {
      console.error('Failed to fetch notices:', err);
      setError('Could not load notices. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotices();
  }, [fetchNotices]);

  const filteredNotices =
    activeFilter === 'ALL'
      ? notices
      : notices.filter((n) => n.type === activeFilter);

  return {
    notices,
    filteredNotices,
    activeFilter,
    isLoading,
    error,
    setActiveFilter,
    refetch: fetchNotices,
  };
}