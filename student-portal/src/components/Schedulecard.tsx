import React from "react";
import { Clock, MapPin, User, BookOpen } from "lucide-react";
import { CourseScheduleEntry } from "../services/erpService";

interface ScheduleCardProps {
  schedule: CourseScheduleEntry;
  isToday?: boolean;
}

// ── Color map: class_schedule_color → Tailwind classes ───────────────────────
const colorMap: Record<string, { bg: string; border: string; dot: string; badge: string }> = {
  blue:   { bg: "bg-blue-50",   border: "border-blue-200",   dot: "bg-blue-500",   badge: "bg-blue-100 text-blue-700"   },
  green:  { bg: "bg-green-50",  border: "border-green-200",  dot: "bg-green-500",  badge: "bg-green-100 text-green-700"  },
  red:    { bg: "bg-red-50",    border: "border-red-200",    dot: "bg-red-500",    badge: "bg-red-100 text-red-700"    },
  yellow: { bg: "bg-yellow-50", border: "border-yellow-200", dot: "bg-yellow-500", badge: "bg-yellow-100 text-yellow-700" },
  purple: { bg: "bg-purple-50", border: "border-purple-200", dot: "bg-purple-500", badge: "bg-purple-100 text-purple-700" },
  pink:   { bg: "bg-pink-50",   border: "border-pink-200",   dot: "bg-pink-500",   badge: "bg-pink-100 text-pink-700"   },
  orange: { bg: "bg-orange-50", border: "border-orange-200", dot: "bg-orange-500", badge: "bg-orange-100 text-orange-700" },
  teal:   { bg: "bg-teal-50",   border: "border-teal-200",   dot: "bg-teal-500",   badge: "bg-teal-100 text-teal-700"   },
};

const defaultColor = { bg: "bg-emerald-50", border: "border-emerald-200", dot: "bg-emerald-500", badge: "bg-emerald-100 text-emerald-700" };

// ── Time formatter: "09:00:00" → "9:00 AM" ───────────────────────────────────
export const formatTime = (time: string): string => {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
};

// ── Duration calculator ───────────────────────────────────────────────────────
export const getDuration = (from: string, to: string): string => {
  if (!from || !to) return "";
  const [fh, fm] = from.split(":").map(Number);
  const [th, tm] = to.split(":").map(Number);
  const mins = (th * 60 + tm) - (fh * 60 + fm);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
};

const ScheduleCard: React.FC<ScheduleCardProps> = ({ schedule, isToday = false }) => {
  const color = colorMap[schedule.class_schedule_color || "blue"] || defaultColor;

  return (
    <div
      className={`
        relative bg-white rounded-3xl border shadow-sm hover:shadow-md
        transition-all duration-200 overflow-hidden group
        ${isToday ? "ring-2 ring-emerald-400 ring-offset-1" : "border-gray-100"}
      `}
    >
      {/* Left color accent bar */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${color.dot} rounded-l-3xl`} />

      <div className="p-5 pl-6">
        {/* Header row */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-xl ${color.bg} transition-transform group-hover:scale-110`}>
              <BookOpen className={`w-4 h-4 ${color.dot.replace("bg-", "text-")}`} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm leading-tight">
                {schedule.course_name || schedule.course}
              </h3>
              {schedule.program && (
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${color.badge}`}>
                  {schedule.program}
                </span>
              )}
            </div>
          </div>

          {isToday && (
            <span className="text-xs font-bold px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">
              Today
            </span>
          )}
        </div>

        {/* Info rows */}
        <div className="space-y-1.5 mt-3">
          {/* Time */}
          <div className="flex items-center gap-2 text-gray-500">
            <Clock className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="text-sm">
              {formatTime(schedule.from_time)} – {formatTime(schedule.to_time)}
            </span>
            <span className="text-xs text-gray-400">
              ({getDuration(schedule.from_time, schedule.to_time)})
            </span>
          </div>

          {/* Instructor */}
          {schedule.instructor_name && (
            <div className="flex items-center gap-2 text-gray-500">
              <User className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="text-sm">{schedule.instructor_name}</span>
            </div>
          )}

          {/* Room */}
          {schedule.room && (
            <div className="flex items-center gap-2 text-gray-500">
              <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="text-sm truncate">{schedule.room}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScheduleCard;