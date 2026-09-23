// pages/ScreenTimePage.tsx
// ✅ Enhanced UI — glassmorphism, glow, charts, animations
// ✅ Today card mein date, dynamic labels
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Clock, Calendar, TrendingUp, BookOpen, Loader2, AlertCircle,
  Users, MapPin, RefreshCw, Sparkles, BarChart3, Activity,
  Zap, Award, Flame,
} from 'lucide-react';
import { useUser } from '../context/UserContext';
import { useScreenTime, formatMinutes, calcDurationMin } from '../Hooks/useScreenTime';
import {
  CoursePieChart,
  MonthlyTrendChart,
  WeeklyBarChart,
  ScreenTimeRadial,
} from '../components/ScreenTimeCharts';

// ── Animated Number ────────────────────────────────────────────────────────

const AnimatedNumber: React.FC<{ value: number; duration?: number }> = ({ value, duration = 800 }) => {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let start = 0;
    const startTime = Date.now();
    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(start + (value - start) * eased));
      if (progress >= 1) clearInterval(timer);
    }, 16);
    return () => clearInterval(timer);
  }, [value, duration]);

  return <>{display}</>;
};

// ── Glass Stat Card ────────────────────────────────────────────────────────

const GlassStatCard: React.FC<{
  icon: React.ReactNode;
  iconClass: string;
  label: string;
  value: number;
  subtitle: string;
  glowColor?: string;
  delay?: number;
}> = ({ icon, iconClass, label, value, subtitle, glowColor = 'emerald', delay = 0 }) => {
  const glowMap: Record<string, string> = {
    emerald: 'hover:shadow-emerald-200/60',
    indigo: 'hover:shadow-indigo-200/60',
    amber: 'hover:shadow-amber-200/60',
  };

  const accentMap: Record<string, string> = {
    emerald: 'via-emerald-400',
    indigo: 'via-indigo-400',
    amber: 'via-amber-400',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className={`relative bg-white/70 backdrop-blur-xl rounded-2xl border border-white/60 p-5 shadow-lg shadow-gray-200/40 ${glowMap[glowColor]} hover:shadow-2xl transition-all duration-300 overflow-hidden group`}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/0 via-transparent to-emerald-50/0 group-hover:from-emerald-50/40 group-hover:to-emerald-100/20 transition-all duration-500 pointer-events-none" />

      <div className="relative">
        <div className="flex items-center gap-3 mb-3">
          <motion.div
            whileHover={{ rotate: 8, scale: 1.1 }}
            transition={{ type: 'spring', stiffness: 300 }}
            className={`w-11 h-11 rounded-xl flex items-center justify-center ${iconClass} shadow-sm`}
          >
            {icon}
          </motion.div>
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">{label}</p>
        </div>

        <div className="flex items-baseline gap-1">
          <p className="text-4xl font-black text-gray-900 leading-none">
            {formatMinutes(value)}
          </p>
        </div>

        <p className="text-xs text-gray-400 mt-2 font-medium">{subtitle}</p>
      </div>

      <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent ${accentMap[glowColor]} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
    </motion.div>
  );
};

// ── Section Wrapper (Glass) ────────────────────────────────────────────────

const GlassSection: React.FC<{
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  delay?: number;
}> = ({ icon, title, subtitle, action, children, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    className="relative bg-white/70 backdrop-blur-xl rounded-2xl border border-white/60 p-5 shadow-lg shadow-gray-200/40 overflow-hidden"
  >
    <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-emerald-100/20 to-transparent rounded-full blur-3xl pointer-events-none" />

    <div className="relative">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-200/60">
            {icon}
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-800">{title}</h3>
            {subtitle && <p className="text-[11px] text-gray-400">{subtitle}</p>}
          </div>
        </div>
        {action}
      </div>
      {children}
    </div>
  </motion.div>
);

// ── Main Page ──────────────────────────────────────────────────────────────

export const ScreenTimePage: React.FC = () => {
  const { user, role, activeStudentId, linkedStudents } = useUser();
  const isGuardian = role === 'guardian';

  const studentId: string | undefined = isGuardian
    ? (activeStudentId ?? undefined)
    : (activeStudentId ?? user?.name ?? undefined);

  const selectedChild = linkedStudents.find((s) => s.student === activeStudentId);

  const {
    loading,
    error,
    refetch,
    todayEntries,
    todayMinutes,
    weekMinutes,
    weekEntries,
    monthMinutes,
    monthEntries,
    dailyBreakdown,
    courseBreakdown,
    monthlyBreakdown,
    allCourses,
    dateRange,
  } = useScreenTime(studentId);

  const displayName = isGuardian
    ? (selectedChild?.student_name || (user as any)?.student_name || 'Your Child')
    : ((user as any)?.student_name || 'Student');

  const todayKey = new Date().toISOString().slice(0, 10);
  const monthPrefix = todayKey.slice(0, 7);

  // ✅ Today's formatted date (dynamic)
  const todayDate = new Date().toLocaleDateString('en-PK', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const todayDateShort = new Date().toLocaleDateString('en-PK', {
    day: 'numeric',
    month: 'short',
  });

  // ✅ Current month label
  const currentMonthLabel = new Date().toLocaleDateString('en-PK', {
    month: 'long',
    year: 'numeric',
  });

  // ✅ Current week range
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  const weekRange = `${weekStart.getDate()} ${weekStart.toLocaleDateString('en-PK', { month: 'short' })} - ${weekEnd.getDate()} ${weekEnd.toLocaleDateString('en-PK', { month: 'short' })}`;

  // PEIRA limit
  const peiraLimit = 180;

  // ── Parent Portal — no child selected ────────────────────────────────
  if (isGuardian && !activeStudentId) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3 text-center px-6">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center mb-2 shadow-lg shadow-blue-200/50"
        >
          <Users className="w-8 h-8 text-blue-500" />
        </motion.div>
        <p className="text-base font-bold text-gray-700">Koi bachha select nahi hua</p>
        <p className="text-sm text-gray-400 max-w-xs">
          Sidebar se apna bachha select karein taake unka screen time dekh sakein.
        </p>
      </div>
    );
  }

  // ── Loading ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="relative">
          <div className="w-12 h-12 rounded-full border-4 border-emerald-100 border-t-emerald-500 animate-spin" />
          <Sparkles className="w-5 h-5 text-emerald-500 absolute inset-0 m-auto animate-pulse" />
        </div>
        <span className="text-sm text-gray-400 font-medium">Loading screen time…</span>
      </div>
    );
  }

  // ── Error ───────────────────────────────────────────────────────────
  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 bg-red-50/80 backdrop-blur-sm text-red-600 rounded-2xl p-4 border border-red-100 max-w-3xl shadow-lg shadow-red-100/50"
      >
        <AlertCircle className="w-5 h-5 shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-semibold">Screen time load nahi ho saka</p>
          <p className="text-xs text-red-400 mt-0.5">{error}</p>
        </div>
        <button
          onClick={refetch}
          className="text-xs font-bold text-red-500 hover:text-red-700 underline"
        >
          Retry
        </button>
      </motion.div>
    );
  }

  // ── Empty ───────────────────────────────────────────────────────────
  if (allCourses.length === 0) {
    return (
      <div className="space-y-5 max-w-4xl pb-8">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-200/60">
              <Clock className="w-5 h-5 text-white" />
            </div>
            {isGuardian ? `${displayName}'s Screen Time` : 'Screen Time'}
          </h1>
          <p className="text-sm text-gray-500 mt-1 ml-12">Total scheduled class time</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/60 p-12 shadow-lg shadow-gray-200/40 text-center"
        >
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center shadow-inner">
            <Calendar className="w-10 h-10 text-gray-400" />
          </div>
          <p className="text-base font-bold text-gray-700 mb-1">No schedule yet</p>
          <p className="text-sm text-gray-400 max-w-xs mx-auto">
            {isGuardian ? `${displayName} ka` : 'Aapka'} koi class schedule abhi tak upload nahi hua.
          </p>
          <button
            onClick={refetch}
            className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-xs font-bold shadow-lg shadow-emerald-200/60 hover:shadow-xl hover:shadow-emerald-300/60 hover:-translate-y-0.5 transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </motion.div>
      </div>
    );
  }

  // ── MAIN PAGE ───────────────────────────────────────────────────────
  return (
    <div className="space-y-5 max-w-5xl pb-8">

      {/* ── Header ───────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start justify-between flex-wrap gap-3"
      >
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-200/60">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">
              {isGuardian ? `${displayName}'s Screen Time` : 'Screen Time'}
            </h1>
          </div>
          <p className="text-sm text-gray-500 ml-14">Total scheduled class time</p>
          {dateRange && (
            <div className="flex items-center gap-2 mt-2 ml-14">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-[11px] font-bold text-emerald-700">
                <Calendar className="w-3 h-3" />
                {dateRange.earliest} → {dateRange.latest}
              </span>
            </div>
          )}
        </div>

        <motion.button
          whileHover={{ scale: 1.03, y: -1 }}
          whileTap={{ scale: 0.97 }}
          onClick={refetch}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/70 backdrop-blur-xl border border-white/60 text-sm font-bold text-emerald-700 shadow-lg shadow-gray-200/40 hover:shadow-xl hover:shadow-emerald-200/40 transition-all"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </motion.button>
      </motion.div>

      {/* ── Stat Cards ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <GlassStatCard
          icon={<Clock className="w-5 h-5 text-white" />}
          iconClass="bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-emerald-200/60"
          label={`Today · ${todayDateShort}`}
          value={todayMinutes}
          subtitle={`${todayEntries.length} classes on ${todayDate}`}
          glowColor="emerald"
          delay={0.05}
        />
        <GlassStatCard
          icon={<Calendar className="w-5 h-5 text-white" />}
          iconClass="bg-gradient-to-br from-indigo-400 to-indigo-600 shadow-indigo-200/60"
          label={`This Week · ${weekRange}`}
          value={weekMinutes}
          subtitle={`${weekEntries.length} classes this week`}
          glowColor="indigo"
          delay={0.1}
        />
        <GlassStatCard
          icon={<TrendingUp className="w-5 h-5 text-white" />}
          iconClass="bg-gradient-to-br from-amber-400 to-amber-600 shadow-amber-200/60"
          label={`This Month · ${currentMonthLabel}`}
          value={monthMinutes}
          subtitle={`${monthEntries.length} classes this month`}
          glowColor="amber"
          delay={0.15}
        />
      </div>

      {/* ── PEIRA Radial + Today's Classes ───────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        <GlassSection
          icon={<Award className="w-4 h-4" />}
          title="Screen Time Meter"
          subtitle={`Today (${todayDateShort}) vs daily limit`}
          delay={0.2}
        >
          <ScreenTimeRadial
            used={todayMinutes}
            limit={peiraLimit}
            tierLabel="PEIRA recommended"
          />
        </GlassSection>

        <div className="lg:col-span-2">
          <GlassSection
            icon={<BookOpen className="w-4 h-4" />}
            title={`Today's Classes · ${todayDateShort}`}
            subtitle={`${todayEntries.length} classes scheduled`}
            delay={0.25}
          >
            {todayEntries.length === 0 ? (
              <div className="text-center py-10">
                <Flame className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No classes today</p>
              </div>
            ) : (
              <div className="space-y-2">
                {todayEntries
                  .slice()
                  .sort((a, b) => a.from_time.localeCompare(b.from_time))
                  .map((entry, i) => {
                    const dur = calcDurationMin(entry.from_time, entry.to_time);
                    const courseName = entry.course_name || entry.course;
                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 + i * 0.05 }}
                        whileHover={{ x: 4 }}
                        className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-gray-50/80 to-white border border-gray-100 hover:border-emerald-200 hover:shadow-md hover:shadow-emerald-100/40 transition-all"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="text-xs font-black text-gray-500 tabular-nums whitespace-nowrap px-2 py-1 rounded-lg bg-white border border-gray-100">
                            {entry.from_time?.slice(0, 5)} - {entry.to_time?.slice(0, 5)}
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-bold text-gray-800 truncate">
                              {courseName}
                            </div>
                            {entry.room && (
                              <div className="flex items-center gap-1 text-[10px] text-gray-400 mt-0.5">
                                <MapPin className="w-2.5 h-2.5" /> {entry.room}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-sm font-black text-emerald-600 whitespace-nowrap ml-2 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-100">
                          {formatMinutes(dur)}
                        </div>
                      </motion.div>
                    );
                  })}
                <div className="flex items-center justify-between pt-3 mt-3 border-t border-gray-100">
                  <span className="text-sm font-bold text-gray-700 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-500" /> Total Today
                  </span>
                  <span className="text-lg font-black text-emerald-600">
                    {formatMinutes(todayMinutes)}
                  </span>
                </div>
              </div>
            )}
          </GlassSection>
        </div>
      </div>

      {/* ── Weekly Bar Chart ─────────────────────────────────────────── */}
      <GlassSection
        icon={<BarChart3 className="w-4 h-4" />}
        title="Weekly Overview"
        subtitle={`Daily screen time · ${weekRange}`}
        delay={0.3}
      >
        <WeeklyBarChart data={dailyBreakdown} todayKey={todayKey} />

        <div className="flex items-center justify-between pt-3 mt-3 border-t border-gray-100">
          <span className="text-sm font-bold text-gray-700">Week Total</span>
          <span className="text-xl font-black text-emerald-600">
            {formatMinutes(weekMinutes)}
          </span>
        </div>
      </GlassSection>

      {/* ── Monthly Trend + Course Pie ───────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        <GlassSection
          icon={<Activity className="w-4 h-4" />}
          title="Monthly Trend"
          subtitle="Screen time over months"
          delay={0.35}
        >
          <MonthlyTrendChart data={monthlyBreakdown} />
        </GlassSection>

        <GlassSection
          icon={<BookOpen className="w-4 h-4" />}
          title="Course Distribution"
          subtitle={`Breakdown · ${currentMonthLabel}`}
          delay={0.4}
        >
          <CoursePieChart data={courseBreakdown} />
        </GlassSection>
      </div>

      {/* ── Course List ──────────────────────────────────────────────── */}
      <GlassSection
        icon={<BookOpen className="w-4 h-4" />}
        title="Course Breakdown"
        subtitle={`${courseBreakdown.length} courses · ${currentMonthLabel}`}
        delay={0.45}
      >
        <div className="space-y-3">
          {courseBreakdown.map((c, i) => {
            const pct = monthMinutes > 0 ? (c.minutes / monthMinutes) * 100 : 0;
            const colors = [
              'from-emerald-400 to-emerald-600',
              'from-blue-400 to-blue-600',
              'from-violet-400 to-violet-600',
              'from-amber-400 to-amber-600',
              'from-pink-400 to-pink-600',
              'from-cyan-400 to-cyan-600',
            ];
            const gradient = colors[i % colors.length];

            return (
              <motion.div
                key={c.course}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + i * 0.05 }}
                whileHover={{ x: 4 }}
                className="space-y-1.5 p-3 rounded-xl hover:bg-gray-50/60 transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-700 text-sm truncate pr-2">
                    {c.course}
                  </span>
                  <span className="font-black text-gray-900 whitespace-nowrap text-sm">
                    {formatMinutes(c.minutes)}
                  </span>
                </div>
                <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ delay: 0.6 + i * 0.05, duration: 0.8, ease: 'easeOut' }}
                    className={`h-full rounded-full bg-gradient-to-r ${gradient} shadow-sm`}
                  />
                </div>
                <div className="text-[11px] text-gray-400 font-medium">
                  {c.classes} classes · {pct.toFixed(1)}%
                </div>
              </motion.div>
            );
          })}
        </div>
      </GlassSection>

    </div>
  );
};

export default ScreenTimePage;