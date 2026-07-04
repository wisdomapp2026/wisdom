import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getAllProgressByUser, getCourseById, getTopicById, getTopicsByCourse } from "@shared/repositories";
import type { UserProgress, Course, Topic } from "@shared/types";
import { Clock, Play, ChevronRight } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { ContinueLoader } from "../components/PageLoader";
import { cachedFetch } from "../hooks/useCache";
import { getLocalProgress } from "../hooks/useLocalProgress";

interface RecentCourse {
  progress: UserProgress;
  course: Course;
  currentTopic: Topic | null;
  totalTopics: number;
  remainingTopics: number;
}

export default function ContinueLearning() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [recentCourses, setRecentCourses] = useState<RecentCourse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    loadData();
  }, [user, authLoading]);

  async function loadData() {
    try {
      let allProgress: UserProgress[] = [];

      if (user) {
        // Login qilgan — DB dan olish
        allProgress = await cachedFetch(`progress-${user.uid}`, () => getAllProgressByUser(user.uid));
      } else {
        // Guest — localStorage dan olish
        const localData = getLocalProgress();
        allProgress = Object.values(localData);
      }

      if (allProgress.length === 0) {
        setLoading(false);
        return;
      }

      // So'nggi kirilgan vaqt bo'yicha tartiblash
      const sorted = [...allProgress].sort((a, b) => (b.lastAccessedAt || 0) - (a.lastAccessedAt || 0));

      // Parallel yuklash — tezroq
      const results = await Promise.all(
        sorted.slice(0, 5).map(async (prog) => {
          const [course, topics] = await Promise.all([
            cachedFetch(`course-${prog.courseId}`, () => getCourseById(prog.courseId)),
            cachedFetch(`topics-${prog.courseId}`, () => getTopicsByCourse(prog.courseId)),
          ]);
          if (!course) return null;

          // Navbatdagi tugatilmagan modulni topish (order bo'yicha birinchi completed bo'lmagan)
          const sortedTopics = [...topics].sort((a, b) => a.order - b.order);
          const nextTopic = sortedTopics.find((t) => !prog.completedTopics.includes(t.id)) || null;

          // Agar nextTopic topilmasa, currentTopicId dan olish (fallback)
          let currentTopic: Topic | null = nextTopic;
          if (!currentTopic && prog.currentTopicId) {
            currentTopic = await cachedFetch(
              `topic-${prog.courseId}-${prog.currentTopicId}`,
              () => getTopicById(prog.courseId, prog.currentTopicId!)
            );
          }

          const remainingTopics = topics.length - prog.completedTopics.length;
          return {
            progress: prog,
            course,
            currentTopic,
            totalTopics: topics.length,
            remainingTopics: Math.max(0, remainingTopics),
          } as RecentCourse;
        })
      );

      setRecentCourses(results.filter(Boolean) as RecentCourse[]);
    } catch (err) {
      console.error("Davom etish ma'lumotlarini yuklashda xatolik:", err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <ContinueLoader />;
  }

  // Oxirgi o'qigan kurs
  const lastCourse = recentCourses[0];
  const progressPercent = lastCourse?.progress.progressPercent || 0;

  return (
    <div className="page-content">
      <header className="px-5 pt-4">
        <h1 className="text-2xl font-bold text-gray-900">Davom etish</h1>
      </header>

      {/* Bugungi maqsad kartasi */}
      {lastCourse ? (
        <div className="mx-5 mt-5 bg-primary-500 rounded-2xl p-5 relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-white text-xl font-bold">Bugungi maqsad</h2>
              <p className="text-white/70 text-sm mt-1">
                {lastCourse.remainingTopics} ta modul qoldi
              </p>
            </div>
            {/* Doiraviy progress */}
            <div className="relative w-16 h-16">
              <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="5" />
                <circle
                  cx="32" cy="32" r="28" fill="none" stroke="white" strokeWidth="5"
                  strokeDasharray={`${2 * Math.PI * 28}`}
                  strokeDashoffset={`${2 * Math.PI * 28 * (1 - progressPercent / 100)}`}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-white text-sm font-bold">
                {progressPercent}%
              </span>
            </div>
          </div>

          <button
            onClick={() => {
              if (lastCourse.currentTopic) {
                navigate(`/course/${lastCourse.course.id}/topic/${lastCourse.currentTopic.id}`);
              } else {
                navigate(`/course/${lastCourse.course.id}`);
              }
            }}
            className="w-full mt-4 bg-white text-gray-900 font-semibold py-3 rounded-xl text-sm active:bg-gray-100"
          >
            Davom ettirish
          </button>
        </div>
      ) : (
        <div className="mx-5 mt-5 bg-gray-50 border border-gray-100 rounded-2xl p-6 text-center">
          <p className="text-4xl mb-3">📚</p>
          <p className="text-gray-500">Hali hech qanday kursni boshlamagansiz</p>
          <Link to="/courses" className="inline-block mt-3 text-primary-500 font-medium text-sm">
            Kurslarni ko'rish →
          </Link>
        </div>
      )}

      {/* Oxirgi o'qilgan kurslar */}
      {recentCourses.length > 0 && (
        <div className="px-5 mt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <Clock size={18} className="text-gray-500" />
              Oxirgi o'qilgan
            </h3>
            <Link to="/courses" className="text-sm text-primary-500 font-medium flex items-center gap-1">
              Barchasi <ChevronRight size={14} />
            </Link>
          </div>

          <div className="space-y-4">
            {recentCourses.map((item) => {
              const timeDiff = Date.now() - (item.progress.lastAccessedAt || 0);
              const hoursAgo = Math.floor(timeDiff / (1000 * 60 * 60));
              const timeLabel = hoursAgo < 1 ? "Hozir" : hoursAgo < 24 ? `${hoursAgo} soat oldin` : `${Math.floor(hoursAgo / 24)} kun oldin`;
              const topicProgress = item.totalTopics > 0
                ? Math.round((item.progress.completedTopics.length / item.totalTopics) * 100)
                : 0;

              return (
                <div key={item.course.id} className="bg-white border border-gray-100 rounded-2xl p-4">
                  {/* Sarlavha */}
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary-50 text-primary-600">
                        {item.course.category}
                      </span>
                      <h4 className="font-bold text-gray-900 mt-1.5">
                        {item.currentTopic?.title || item.course.title}
                      </h4>
                      {item.currentTopic && (
                        <p className="text-xs text-gray-400 mt-0.5">📖 {item.course.title}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-gray-400 uppercase font-semibold">So'nggi faollik</p>
                      <p className="text-xs text-gray-600 flex items-center gap-1 mt-0.5">
                        <Clock size={11} /> {timeLabel}
                      </p>
                    </div>
                  </div>

                  {/* Progress */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-500">Modul progressi</span>
                      <span className="text-xs font-bold text-primary-500">{topicProgress}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full">
                      <div className="h-full bg-primary-500 rounded-full transition-all" style={{ width: `${topicProgress}%` }} />
                    </div>
                  </div>

                  {/* Davom etish button */}
                  <button
                    onClick={() => {
                      if (item.currentTopic) {
                        navigate(`/course/${item.course.id}/topic/${item.currentTopic.id}`);
                      } else {
                        navigate(`/course/${item.course.id}`);
                      }
                    }}
                    className="w-full mt-3 border border-gray-200 rounded-xl py-2.5 text-sm font-medium text-primary-500 flex items-center justify-center gap-2 active:bg-gray-50"
                  >
                    <Play size={14} className="text-primary-500" /> Darsni davom ettirish
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
