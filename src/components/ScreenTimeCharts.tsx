// components/ScreenTimeCharts.tsx
// ✅ FIXED: Y-axis "2h 30m" format, broader bars, bigger charts, better tooltips
import React from 'react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  BarChart, Bar, RadialBarChart, RadialBar, PolarAngleAxis,
} from 'recharts';
import { formatMinutesLabel } from '../Hooks/useScreenTime';

// ── Colors palette ─────────────────────────────────────────────────────────
const CHART_COLORS = [
  '#10b981', '#3b82f6', '#8b5cf6', '#f59e0b',
  '#ec4899', '#06b6d4', '#ef4444', '#14b8a6',
];

const fmt = (mins: number): string => formatMinutesLabel(mins);

// ── Y-Axis Formatter: Recharts gives hours (decimal), we show "2h 30m" ────
const formatYAxis = (valueInHours: number): string => {
  if (valueInHours === 0) return '0';
  const mins = Math.round(valueInHours * 60);
  return fmt(mins);
};

// ── Glass Tooltip (generic) ────────────────────────────────────────────────
const GlassTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;

  return (
    <div className="bg-white/95 backdrop-blur-xl border border-white/60 rounded-xl px-4 py-3 shadow-2xl">
      {label && (
        <p className="text-[11px] font-black text-gray-500 uppercase tracking-wider mb-2">
          {label}
        </p>
      )}
      {payload.map((p: any, i: number) => {
        const hoursValue = typeof p.value === 'number' ? p.value : 0;
        const mins = Math.round(hoursValue * 60);
        const display = fmt(mins);

        return (
          <div key={i} className="flex items-center gap-2 py-0.5">
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ background: p.color || p.payload?.fill }}
            />
            <span className="text-xs font-semibold text-gray-600">
              Duration:
            </span>
            <span className="text-xs font-black text-gray-900 ml-auto">
              {display}
            </span>
          </div>
        );
      })}
    </div>
  );
};

// ── 1. Pie Chart (Course Distribution) ─────────────────────────────────────
export const CoursePieChart: React.FC<{
  data: { course: string; minutes: number; classes: number }[];
}> = ({ data }) => {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-[320px] text-gray-300 text-sm font-medium">
        No course data
      </div>
    );
  }

  const total = data.reduce((s, d) => s + d.minutes, 0);
  const chartData = data.map((d, i) => ({
    name: d.course,
    value: d.minutes,
    classes: d.classes,
    fill: CHART_COLORS[i % CHART_COLORS.length],
  }));

  return (
    <div className="relative" style={{ width: '100%', height: 320 }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={70}
            outerRadius={115}
            paddingAngle={3}
            dataKey="value"
            animationDuration={800}
          >
            {chartData.map((entry, i) => (
              <Cell key={i} fill={entry.fill} stroke="#fff" strokeWidth={2} />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload;
              return (
                <div className="bg-white/95 backdrop-blur-xl border border-white/60 rounded-xl px-4 py-3 shadow-2xl">
                  <p className="text-[11px] font-black text-gray-500 uppercase tracking-wider mb-2">
                    {d.name}
                  </p>
                  <div className="flex items-center gap-2 py-0.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ background: d.fill }}
                    />
                    <span className="text-xs font-semibold text-gray-600">
                      Duration:
                    </span>
                    <span className="text-xs font-black text-gray-900 ml-auto">
                      {fmt(d.value)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 py-0.5 mt-1">
                    <span className="text-xs font-semibold text-gray-600">
                      Classes:
                    </span>
                    <span className="text-xs font-black text-gray-900 ml-auto">
                      {d.classes}
                    </span>
                  </div>
                </div>
              );
            }}
          />
        </PieChart>
      </ResponsiveContainer>

      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="text-center">
          <p className="text-3xl font-black text-gray-800">{fmt(total)}</p>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total</p>
        </div>
      </div>
    </div>
  );
};

// ── 2. Area Chart (Monthly Trend) — BEAUTIFUL & BALANCED ──────────────────
export const MonthlyTrendChart: React.FC<{
  data: { key: string; label: string; minutes: number; classes: number }[];
}> = ({ data }) => {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-[320px] text-gray-300 text-sm font-medium">
        No monthly data
      </div>
    );
  }

  const chartData = [...data].reverse().map((d) => ({
    month: d.label.split(' ')[0],
    year: d.label.split(' ')[1],
    minutes: d.minutes,
    hours: +(d.minutes / 60).toFixed(2),
    classes: d.classes,
  }));

  return (
    <div style={{ width: '100%', height: 320 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 20, right: 20, left: 0, bottom: 20 }}
        >
          <defs>
            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity={0.55} />
              <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
            </linearGradient>
          </defs>

          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#f0f4f0"
            vertical={false}
          />

          <XAxis
            dataKey="month"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 13, fontWeight: 700, fill: '#6b7280' }}
            dy={8}
            interval={0}
          />

          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fontWeight: 700, fill: '#9ca3af' }}
            tickFormatter={formatYAxis}
            width={50}
          />

          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload;
              return (
                <div className="bg-white/95 backdrop-blur-xl border border-white/60 rounded-xl px-4 py-3 shadow-2xl">
                  <p className="text-[11px] font-black text-gray-500 uppercase tracking-wider mb-2">
                    {label} {d.year}
                  </p>
                  <div className="flex items-center gap-2 py-0.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ background: '#10b981' }}
                    />
                    <span className="text-xs font-semibold text-gray-600">
                      Total:
                    </span>
                    <span className="text-xs font-black text-gray-900 ml-auto">
                      {fmt(d.minutes)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 py-0.5 mt-1">
                    <span className="text-xs font-semibold text-gray-600">
                      Classes:
                    </span>
                    <span className="text-xs font-black text-gray-900 ml-auto">
                      {d.classes}
                    </span>
                  </div>
                </div>
              );
            }}
          />

          <Area
            type="monotone"
            dataKey="hours"
            stroke="#10b981"
            strokeWidth={3}
            fill="url(#areaGradient)"
            animationDuration={1000}
            dot={{
              fill: '#10b981',
              r: 6,
              strokeWidth: 3,
              stroke: '#fff',
            }}
            activeDot={{
              r: 9,
              fill: '#10b981',
              stroke: '#fff',
              strokeWidth: 3,
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

// ── 3. Bar Chart (Weekly) — BEAUTIFUL & BALANCED ──────────────────────────
export const WeeklyBarChart: React.FC<{
  data: { label: string; minutes: number; classes: number; key: string }[];
  todayKey: string;
}> = ({ data, todayKey }) => {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-[320px] text-gray-300 text-sm font-medium">
        No weekly data
      </div>
    );
  }

  const chartData = data.map((d) => ({
    day: d.label,
    minutes: d.minutes,
    hours: +(d.minutes / 60).toFixed(2),
    classes: d.classes,
    isToday: d.key === todayKey,
  }));

  return (
    <div style={{ width: '100%', height: 320 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 20, left: 0, bottom: 20 }}
          barCategoryGap="28%"
        >
          <defs>
            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
              <stop offset="100%" stopColor="#059669" stopOpacity={0.85} />
            </linearGradient>
            <linearGradient id="barGradientToday" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#34d399" stopOpacity={1} />
              <stop offset="100%" stopColor="#10b981" stopOpacity={0.95} />
            </linearGradient>
          </defs>

          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#f0f4f0"
            vertical={false}
          />

          <XAxis
            dataKey="day"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 13, fontWeight: 700, fill: '#6b7280' }}
            dy={8}
            interval={0}
          />

          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fontWeight: 700, fill: '#9ca3af' }}
            tickFormatter={formatYAxis}
            width={50}
          />

          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload;
              return (
                <div className="bg-white/95 backdrop-blur-xl border border-white/60 rounded-xl px-4 py-3 shadow-2xl">
                  <p className="text-[11px] font-black text-gray-500 uppercase tracking-wider mb-2">
                    {d.day} {d.isToday && '· Today'}
                  </p>
                  <div className="flex items-center gap-2 py-0.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ background: '#10b981' }}
                    />
                    <span className="text-xs font-semibold text-gray-600">
                      Duration:
                    </span>
                    <span className="text-xs font-black text-gray-900 ml-auto">
                      {fmt(d.minutes)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 py-0.5 mt-1">
                    <span className="text-xs font-semibold text-gray-600">
                      Classes:
                    </span>
                    <span className="text-xs font-black text-gray-900 ml-auto">
                      {d.classes}
                    </span>
                  </div>
                </div>
              );
            }}
            cursor={{ fill: 'rgba(16,185,129,0.06)' }}
          />

          <Bar
            dataKey="hours"
            radius={[10, 10, 0, 0]}
            animationDuration={900}
            maxBarSize={64}
          >
            {chartData.map((entry, i) => (
              <Cell
                key={i}
                fill={entry.isToday ? 'url(#barGradientToday)' : 'url(#barGradient)'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

// ── 4. Radial Chart (PEIRA Meter) ─────────────────────────────────────────
export const ScreenTimeRadial: React.FC<{
  used: number;
  limit: number;
  tierLabel?: string;
}> = ({ used, limit, tierLabel }) => {
  const pct = Math.min(100, Math.round((used / limit) * 100));
  const over = used > limit;
  const near = !over && pct >= 85;

  const color = over ? '#ef4444' : near ? '#f59e0b' : '#10b981';
  const data = [{ name: 'Used', value: pct, fill: color }];

  return (
    <div className="relative" style={{ width: '100%', height: 220 }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          cx="50%"
          cy="50%"
          innerRadius="70%"
          outerRadius="100%"
          startAngle={90}
          endAngle={-270}
          data={data}
        >
          <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
          <RadialBar
            dataKey="value"
            cornerRadius={20}
            animationDuration={1000}
            fill={color}
          />
        </RadialBarChart>
      </ResponsiveContainer>

      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <p className="text-3xl font-black" style={{ color }}>
          {pct}%
        </p>
        <p className="text-[11px] font-black text-gray-500 mt-1">
          {fmt(used)} <span className="text-gray-300">/</span> {fmt(limit)}
        </p>
        {tierLabel && (
          <p className="text-[10px] text-gray-400 mt-0.5 font-medium">
            {tierLabel}
          </p>
        )}
      </div>
    </div>
  );
};