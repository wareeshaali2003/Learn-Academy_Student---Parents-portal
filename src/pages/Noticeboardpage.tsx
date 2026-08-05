import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import {
  Newspaper,
  Radio,
  ScrollText,
  Bell,
  RefreshCw,
  AlertCircle,
  Inbox,
  Clock,
} from 'lucide-react';
import { useNoticeBoard, NoticeType } from '../Hooks/Usenoticeboard';

// ─── Type config ────────────────────────────────────────────────────────────
const TYPE_CONFIG: Record<
  NoticeType | 'ALL',
  { label: string; icon: React.ReactNode; color: string; bg: string; border: string; dot: string }
> = {
  ALL: {
    label: 'All',
    icon: <Bell className="w-4 h-4" />,
    color: 'text-gray-700',
    bg: 'bg-gray-100',
    border: 'border-gray-200',
    dot: 'bg-gray-400',
  },
  NEWS: {
    label: 'News',
    icon: <Newspaper className="w-4 h-4" />,
    color: 'text-blue-700',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    dot: 'bg-blue-500',
  },
  STREAM: {
    label: 'Stream',
    icon: <Radio className="w-4 h-4" />,
    color: 'text-purple-700',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    dot: 'bg-purple-500',
  },
  CIRCULAR: {
    label: 'Circular',
    icon: <ScrollText className="w-4 h-4" />,
    color: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    dot: 'bg-amber-500',
  },
};

// ─── Filter Tab ──────────────────────────────────────────────────────────────
const FilterTab: React.FC<{
  type: NoticeType | 'ALL';
  count: number;
  isActive: boolean;
  onClick: () => void;
}> = ({ type, count, isActive, onClick }) => {
  const cfg = TYPE_CONFIG[type];
  return (
    <button
      onClick={onClick}
      className={`
        relative flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold
        transition-all duration-200 border
        ${isActive
          ? `${cfg.bg} ${cfg.color} ${cfg.border} shadow-sm`
          : 'bg-white text-gray-500 border-gray-100 hover:bg-gray-50 hover:text-gray-700'
        }
      `}
    >
      {cfg.icon}
      {cfg.label}
      {count > 0 && (
        <span className={`
          text-xs px-1.5 py-0.5 rounded-full font-bold min-w-[20px] text-center
          ${isActive ? 'bg-white/70' : 'bg-gray-100 text-gray-500'}
        `}>
          {count}
        </span>
      )}
    </button>
  );
};

// ─── Notice Card ─────────────────────────────────────────────────────────────
const NoticeCard: React.FC<{ notice: import('../Hooks/Usenoticeboard').Notice; index: number }> = ({
  notice,
  index,
}) => {
  const cfg = TYPE_CONFIG[notice.type] ?? TYPE_CONFIG['NEWS'];
  const date = new Date(notice.creation);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25, delay: index * 0.05 }}
      className={`
        bg-white rounded-2xl border p-5 hover:shadow-md transition-all duration-200
        ${cfg.border}
      `}
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5">
          {/* Type badge */}
          <span className={`
            inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold
            ${cfg.bg} ${cfg.color}
          `}>
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
            {cfg.label}
          </span>
        </div>
        {/* Date */}
        <div className="flex items-center gap-1 text-xs text-gray-400 flex-shrink-0">
          <Clock className="w-3 h-3" />
          {format(date, 'dd MMM yyyy · hh:mm a')}
        </div>
      </div>

      {/* Subject */}
      <h3 className="font-bold text-gray-900 text-base mb-1.5 leading-snug">
        {notice.subject}
      </h3>

      {/* Message */}
      <p className="text-sm text-gray-500 leading-relaxed">
        {notice.message}
      </p>

      {/* Footer */}
      <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between">
        <span className="text-xs text-gray-400">
          Posted by <span className="font-medium text-gray-600">{notice.owner}</span>
        </span>
        <span className="text-xs text-gray-300 font-mono">{notice.name}</span>
      </div>
    </motion.div>
  );
};

// ─── Main Page ───────────────────────────────────────────────────────────────
export const NoticeBoardPage: React.FC = () => {
  const {
    notices,
    filteredNotices,
    activeFilter,
    isLoading,
    error,
    setActiveFilter,
    refetch,
  } = useNoticeBoard();

  const countFor = (type: NoticeType | 'ALL') =>
    type === 'ALL' ? notices.length : notices.filter((n) => n.type === type).length;

  return (
    <div className="space-y-6 animate-slide-up">

      {/* ── Page Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary-green" />
            Notice Board
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Stay updated with school news, circulars, and announcements.
          </p>
        </div>
        <button
          onClick={refetch}
          disabled={isLoading}
          className="p-2.5 rounded-xl bg-white border border-gray-200 text-gray-500
            hover:text-primary-green hover:border-green-200 transition-all duration-200
            disabled:opacity-50"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* ── Filter Tabs ── */}
      <div className="flex flex-wrap gap-2">
        {(['ALL', 'NEWS', 'STREAM', 'CIRCULAR'] as const).map((type) => (
          <FilterTab
            key={type}
            type={type}
            count={countFor(type)}
            isActive={activeFilter === type}
            onClick={() => setActiveFilter(type)}
          />
        ))}
      </div>

      {/* ── Loading ── */}
      {isLoading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse">
              <div className="flex gap-3 mb-3">
                <div className="h-6 w-16 bg-gray-100 rounded-xl" />
                <div className="h-6 w-32 bg-gray-100 rounded-xl ml-auto" />
              </div>
              <div className="h-5 w-3/4 bg-gray-100 rounded-lg mb-2" />
              <div className="h-4 w-full bg-gray-100 rounded-lg mb-1" />
              <div className="h-4 w-2/3 bg-gray-100 rounded-lg" />
            </div>
          ))}
        </div>
      )}

      {/* ── Error ── */}
      {!isLoading && error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-bold text-red-700">Failed to load notices</p>
            <p className="text-xs text-red-500 mt-0.5">{error}</p>
          </div>
          <button
            onClick={refetch}
            className="text-xs font-semibold text-red-600 bg-white border border-red-200 px-3 py-1.5 rounded-xl hover:bg-red-50 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* ── Empty State ── */}
      {!isLoading && !error && filteredNotices.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
          <Inbox className="w-10 h-10 mx-auto mb-3 text-gray-200" />
          <p className="text-sm font-semibold text-gray-400">No notices found</p>
          <p className="text-xs text-gray-300 mt-1">
            {activeFilter === 'ALL'
              ? 'No notices have been posted yet.'
              : `No ${TYPE_CONFIG[activeFilter].label} notices available.`}
          </p>
        </div>
      )}

      {/* ── Notice List ── */}
      {!isLoading && !error && filteredNotices.length > 0 && (
        <AnimatePresence mode="popLayout">
          <div className="space-y-4">
            {filteredNotices.map((notice, i) => (
              <NoticeCard key={notice.name} notice={notice} index={i} />
            ))}
          </div>
        </AnimatePresence>
      )}

    </div>
  );
};