import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getAllProgressByUser, getCourseById, getTopicById, getTopicsByCourse } from "@shared/repositories";
import type { UserProgress, Course, Topic } from "@shared/types";
import { Clock, Play, BookOpen, Target, TrendingUp, ChevronRight } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { ContinueLoader } from "../components/PageLoader";
import { cachedFetch } from "../hooks/useCache";
import { getLocalProgress } from "../hooks/useLocalProgress";

/** "3-modul: 1 - mavzu: Nom" → "1-mavzu: Nom" */
function cleanTopicTitle(title: string): string {
  const full = title.match(/^\d+-modul:\s*(\d+)\s*-\s*mavzu:\s*(.*)/i);
  if (full) return `${full[1]}-mavzu: ${full[2]}`;
  if (/^\d+-mavzu:/i.test(title)) return title;
  const m = title.match(/^(\d+)-modul:\s*(.*)/i);
  if (m) return `${m[1]}-mavzu: ${m[2]}`;
  return title;
}

interface RecentCourse {
  progress: UserProgress;
  course: Course;
  currentTopic: Topic | null;
  totalTopics: number;
  completedCount: number;
  remainingTopics: number;
}

export default function ContinueLearning() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [recentCourses, setRecentCourses] = useState<RecentCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [zoomImage, setZoomImage] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    loadData();
  }, [user, authLoading]);

  async function loadData() {
    try {
      let allProgress: UserProgress[] = [];
      if (user) {
        allProgress = await cachedFetch(`progress-${user.uid}`, () => getAllProgressByUser(user.uid));
      } else {
        allProgress = Object.values(getLocalProgress());
      }

      if (allProgress.length === 0) {
        setLoading(false);
        return;
      }

      const sorted = [...allProgress].sort((a, b) => (b.lastAccessedAt || 0) - (a.lastAccessedAt || 0));

      const results = await Promise.all(
        sorted.slice(0, 10).map(async (prog) => {
          const [course, topics] = await Promise.all([
            cachedFetch(`course-${prog.courseId}`, () => getCourseById(prog.courseId)),
            cachedFetch(`topics-${prog.courseId}`, () => getTopicsByCourse(prog.courseId)),
          ]);
          if (!course) return null;

          const validTopicIds = topics.map((t) => t.id);
          const completedCount = prog.completedTopics.filter((id) => validTopicIds.includes(id)).length;
          const sortedTopics = [...topics].sort((a, b) => a.order - b.order);
          const nextTopic = sortedTopics.find((t) => !prog.completedTopics.includes(t.id)) || null;

          let currentTopic: Topic | null = nextTopic;
          if (!currentTopic && prog.currentTopicId) {
            currentTopic = await cachedFetch(
              `topic-${prog.courseId}-${prog.currentTopicId}`,
              () => getTopicById(prog.courseId, prog.currentTopicId!)
            );
          }

          return {
            progress: prog,
            course,
            currentTopic,
            totalTopics: topics.length,
            completedCount,
            remainingTopics: Math.max(0, topics.length - completedCount),
          } as RecentCourse;
        })
      );

      setRecentCourses(results.filter(Boolean) as RecentCourse[]);
    } catch (err) {
      console.error("Davom etish yuklashda xatolik:", err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <ContinueLoader />;

  const lastCourse = recentCourses[0];
  const totalCompleted = recentCourses.reduce((s, r) => s + r.completedCount, 0);
  const totalAll = recentCourses.reduce((s, r) => s + r.totalTopics, 0);
  const overallPercent = totalAll > 0 ? Math.round((totalCompleted / totalAll) * 100) : 0;

  return (
    <div className="page-content pb-24">
      {/* ===== Hero ===== */}
      <div className="bg-gradient-to-br from-[#1e1b4b] via-[#312e81] to-[#4338ca] px-5 pt-5 pb-14 rounded-b-[2rem]">
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-xl font-bold text-white">Davom etish</h1>
          <div className="flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1.5">
            <TrendingUp size={13} className="text-green-400" />
            <span className="text-xs text-white font-medium">{overallPercent}% umumiy</span>
          </div>
        </div>

        {lastCourse ? (
          <div className="bg-white/10 backdrop-blur rounded-2xl p-5">
            <div className="flex items-start gap-4">
              {/* Dumaloq progress */}
              <div className="relative w-16 h-16 shrink-0">
                <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                  <circle cx="32" cy="32" r="27" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="5" />
                  <circle
                    cx="32" cy="32" r="27" fill="none" stroke="#a5b4fc" strokeWidth="5"
                    strokeDasharray={2 * Math.PI * 27}
                    strokeDashoffset={2 * Math.PI * 27 * (1 - (lastCourse.totalTopics > 0 ? lastCourse.completedCount / lastCourse.totalTopics : 0))}
                    strokeLinecap="round"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-white text-sm font-bold">
                  {lastCourse.totalTopics > 0 ? Math.round((lastCourse.completedCount / lastCourse.totalTopics) * 100) : 0}%
                </span>
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-white/50 text-[10px] font-semibold uppercase tracking-wide">Hozir o'qiyapsiz</p>
                <p className="text-white font-bold text-base leading-snug mt-0.5 line-clamp-2">{lastCourse.course.title}</p>
                {lastCourse.currentTopic && (
                  <p className="text-white/60 text-xs mt-1 truncate">
                    Keyingi: {cleanTopicTitle(lastCourse.currentTopic.title)}
                  </p>
                )}
                <p className="text-white/40 text-[10px] mt-1.5">
                  {lastCourse.completedCount}/{lastCourse.totalTopics} mavzu · {lastCourse.remainingTopics} ta qoldi
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                if (lastCourse.currentTopic) navigate(`/course/${lastCourse.course.id}/topic/${lastCourse.currentTopic.id}`);
                else navigate(`/course/${lastCourse.course.id}`);
              }}
              className="w-full mt-4 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-3 rounded-xl text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
            >
              <Play size={16} fill="currentColor" /> Davom ettirish
            </button>
          </div>
        ) : (
          <div className="bg-white/10 backdrop-blur rounded-2xl p-6 text-center">
            <p className="text-3xl mb-2">📚</p>
            <p className="text-white/70 text-sm">Hali hech qanday kursni boshlamagansiz</p>
            <Link to="/courses" className="text-sm text-indigo-300 font-medium mt-2 inline-block">
              Kurslarni ko'rish →
            </Link>
          </div>
        )}
      </div>

      {/* ===== Statistika ===== */}
      <div className="mx-4 -mt-8 relative z-10 bg-white rounded-2xl shadow-lg py-4">
        <div className="flex items-stretch">
          <div className="flex-1 min-w-0 flex flex-col items-center gap-1 px-1">
            <BookOpen size={17} className="text-indigo-500" />
            <p className="text-sm font-bold text-gray-900">{recentCourses.length}</p>
            <p className="text-[10px] text-gray-400">Kurslar</p>
          </div>
          <div className="w-px bg-gray-100 my-1" />
          <div className="flex-1 min-w-0 flex flex-col items-center gap-1 px-1">
            <Target size={17} className="text-green-500" />
            <p className="text-sm font-bold text-gray-900">{totalCompleted}</p>
            <p className="text-[10px] text-gray-400">Tugatilgan</p>
          </div>
          <div className="w-px bg-gray-100 my-1" />
          <div className="flex-1 min-w-0 flex flex-col items-center gap-1 px-1">
            <Clock size={17} className="text-amber-500" />
            <p className="text-sm font-bold text-gray-900">{totalAll - totalCompleted}</p>
            <p className="text-[10px] text-gray-400">Qolgan</p>
          </div>
        </div>
      </div>

      {/* ===== Kurslar ro'yxati ===== */}
      {recentCourses.length > 0 && (
        <section className="px-4 mt-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Clock size={15} className="text-gray-400" />
              <h3 className="font-bold text-gray-900 text-base">Oxirgi o'qilgan kurslar</h3>
            </div>
          </div>

          <div className="space-y-3">
            {recentCourses.map((item) => {
              const timeDiff = Date.now() - (item.progress.lastAccessedAt || 0);
              const hoursAgo = Math.floor(timeDiff / (1000 * 60 * 60));
              const timeLabel =
                hoursAgo < 1 ? "Hozir" : hoursAgo < 24 ? `${hoursAgo} soat oldin` : `${Math.floor(hoursAgo / 24)} kun oldin`;
              const pct = item.totalTopics > 0 ? Math.round((item.completedCount / item.totalTopics) * 100) : 0;

              return (
                <button
                  key={item.course.id}
                  onClick={() => {
                    if (item.currentTopic) navigate(`/course/${item.course.id}/topic/${item.currentTopic.id}`);
                    else navigate(`/course/${item.course.id}`);
                  }}
                  className="w-full bg-white border border-gray-100 rounded-2xl p-4 text-left shadow-sm active:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    {/* Ikonka */}
                    <div
                      className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center shrink-0 overflow-hidden cursor-pointer active:scale-110 transition-transform"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (item.course.coverImage) setZoomImage(item.course.coverImage);
                      }}
                    >
                      {item.course.coverImage ? (
                        <img src={item.course.coverImage} alt="" className="w-full h-full object-contain" />
                      ) : (
                        <BookOpen size={20} className="text-indigo-500" />
                      )}
                    </div>

                    {/* Ma'lumot */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-gray-900 leading-snug line-clamp-2">
                            {item.course.title}
                          </p>
                          {item.currentTopic && (
                            <p className="text-[11px] text-indigo-500 font-medium mt-0.5 leading-snug">
                              Keyingi: {cleanTopicTitle(item.currentTopic.title)}
                            </p>
                          )}
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-[10px] text-gray-400">{timeLabel}</p>
                        </div>
                      </div>

                      {/* Progress */}
                      <div className="mt-2.5">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] text-gray-400">
                            {item.completedCount}/{item.totalTopics} mavzu
                          </span>
                          <span className="text-xs font-bold text-indigo-500">{pct}%</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-indigo-400 to-indigo-600 rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>

                      {/* Davom etish */}
                      <div className="mt-2.5 flex items-center gap-1.5 text-indigo-500">
                        <Play size={11} fill="currentColor" />
                        <span className="text-[11px] font-semibold">Davom ettirish</span>
                        <ChevronRight size={12} className="ml-auto text-gray-300" />
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* ===== Bo'sh holat ===== */}
      {recentCourses.length === 0 && (
        <div className="px-4 mt-8 text-center">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
            <BookOpen size={24} className="text-gray-300" />
          </div>
          <p className="text-sm text-gray-500">Hozircha o'qiyotgan kurslar yo'q</p>
          <Link to="/courses" className="text-sm text-indigo-500 font-semibold mt-2 inline-block">
            Kurslarni ko'rish →
          </Link>
        </div>
      )}

      {/* ===== Rasm zoom modali ===== */}
      {zoomImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setZoomImage(null)}
        >
          <img
            src={zoomImage}
            alt=""
            className="max-w-[90vw] max-h-[80vh] object-contain rounded-xl shadow-2xl"
          />
        </div>
      )}
    </div>
  );
}
