import { useState, useEffect } from "react";
import { X, Loader2, Clock, Calendar, Activity, Users } from "lucide-react";
import { getAllStudentActivities, getTodayActiveStudents } from "@shared/repositories";
import type { UserActivity } from "@shared/types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function StudentActivityModal({ isOpen, onClose }: Props) {
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDays, setSelectedDays] = useState(7);
  const [viewMode, setViewMode] = useState<"today" | "week">("today");

  useEffect(() => {
    if (isOpen) {
      loadActivities();
    }
  }, [isOpen, viewMode, selectedDays]);

  async function loadActivities() {
    setLoading(true);
    try {
      if (viewMode === "today") {
        const data = await getTodayActiveStudents();
        setActivities(data);
      } else {
        const data = await getAllStudentActivities(selectedDays);
        setActivities(data);
      }
    } catch (err) {
      console.error("Faollik ma'lumotlarini yuklashda xatolik:", err);
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  // O'quvchilar bo'yicha guruhlab ko'rsatish
  const studentMap = new Map<string, { userName: string; totalMinutes: number; lastActiveAt: number; dates: string[] }>();
  activities.forEach((a) => {
    const existing = studentMap.get(a.userId);
    if (existing) {
      existing.totalMinutes += a.totalMinutes;
      if (a.lastActiveAt > existing.lastActiveAt) {
        existing.lastActiveAt = a.lastActiveAt;
      }
      if (!existing.dates.includes(a.date)) {
        existing.dates.push(a.date);
      }
    } else {
      studentMap.set(a.userId, {
        userName: a.userName,
        totalMinutes: a.totalMinutes,
        lastActiveAt: a.lastActiveAt,
        dates: [a.date],
      });
    }
  });

  const studentList = Array.from(studentMap.entries())
    .map(([userId, data]) => ({ userId, ...data }))
    .sort((a, b) => b.lastActiveAt - a.lastActiveAt);

  function formatMinutes(min: number): string {
    if (min < 1) return "< 1 daq";
    if (min < 60) return `${min} daq`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m > 0 ? `${h} soat ${m} daq` : `${h} soat`;
  }

  function formatLastActive(timestamp: number): string {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "Hozir faol";
    if (minutes < 60) return `${minutes} daqiqa oldin`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} soat oldin`;
    const days = Math.floor(hours / 24);
    return `${days} kun oldin`;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 overflow-y-auto py-8">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
              <Activity className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">O'quvchilarning faolligi</h2>
              <p className="text-xs text-gray-500">Kunlik ishlatish vaqti va oxirgi kirgan kuni</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs & Filters */}
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode("today")}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                viewMode === "today" ? "bg-green-500 text-white" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-100"
              }`}
            >
              Bugun
            </button>
            <button
              onClick={() => setViewMode("week")}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                viewMode === "week" ? "bg-green-500 text-white" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-100"
              }`}
            >
              Hafta
            </button>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Users className="w-4 h-4" />
            <span>{studentList.length} ta o'quvchi</span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 text-green-500 animate-spin" />
            </div>
          )}

          {!loading && studentList.length === 0 && (
            <div className="text-center py-16">
              <Activity className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">Faollik topilmadi</p>
              <p className="text-sm text-gray-400 mt-1">
                {viewMode === "today" ? "Bugun hali hech kim dasturga kirmagan" : "Bu davrda faollik yo'q"}
              </p>
            </div>
          )}

          {!loading && studentList.length > 0 && (
            <div className="space-y-3">
              {studentList.map((student) => (
                <div
                  key={student.userId}
                  className="flex items-center justify-between bg-gray-50 rounded-xl p-4 border border-gray-100 hover:border-green-200 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                      <span className="text-sm font-bold text-primary-600">
                        {student.userName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    {/* Info */}
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{student.userName}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <Clock className="w-3 h-3" />
                          {formatMinutes(student.totalMinutes)}
                        </span>
                        {viewMode === "week" && (
                          <span className="flex items-center gap-1 text-xs text-gray-500">
                            <Calendar className="w-3 h-3" />
                            {student.dates.length} kun faol
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Last Active */}
                  <div className="text-right">
                    <p className={`text-xs font-medium ${
                      Date.now() - student.lastActiveAt < 300000 ? "text-green-600" : "text-gray-500"
                    }`}>
                      {formatLastActive(student.lastActiveAt)}
                    </p>
                    {Date.now() - student.lastActiveAt < 300000 && (
                      <span className="inline-flex items-center gap-1 mt-1">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                        <span className="text-[10px] text-green-600 font-medium">Online</span>
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
