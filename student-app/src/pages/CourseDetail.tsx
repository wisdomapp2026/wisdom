import { Link, useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { getCourseById, getTopicsByCourse, getTestsByCourse, getUserProgress, getProblemsByTopic, getAllProgressByCourse, getAdviceByCourse, getMotivationPhrases, getMotivationSettings } from "@shared/repositories";
import type { Course, Topic, Test, UserProgress, Advice, MotivationalPhrase, MotivationSettings } from "@shared/types";
import { Search, Bell, CheckCircle, Clock, Lock, FileText, Play, ChevronDown, ChevronUp, MessageSquare } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useSubscription } from "../hooks/useSubscription";

export default function CourseDetail() {
  const { courseId } = useParams<{ courseId: string }>();
  const { user } = useAuth();
  const { isPremium: hasSubscription } = useSubscription();
  const [course, setCourse] = useState<Course | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [tests, setTests] = useState<Test[]>([]);
  const [advices, setAdvices] = useState<Advice[]>([]);
  const [loading, setLoading] = useState(true);
  const [userProgress, setUserProgress] = useState<UserProgress | null>(null);
  const [topicProblemCounts, setTopicProblemCounts] = useState<Record<string, number>>({});
  const [userRank, setUserRank] = useState<number | null>(null);
  const [totalStudentsInCourse, setTotalStudentsInCourse] = useState(0);
  const [motivationPhrase, setMotivationPhrase] = useState<string>("");

  useEffect(() => {
    if (!courseId) return;
    loadData();
  }, [courseId, user]);

  async function loadData() {
    if (!courseId) return;
    try {
      const [c, t, te] = await Promise.all([
        getCourseById(courseId),
        getTopicsByCourse(courseId),
        getTestsByCourse(courseId),
      ]);
      setCourse(c);
      setTopics(t);
      setTests(te.filter(x => x.status === "published"));

      // Maslahat bloklarini yuklash
      const adv = await getAdviceByCourse(courseId);
      setAdvices(adv);

      // User progress
      if (user) {
        const prog = await getUserProgress(user.uid, courseId);
        setUserProgress(prog);

        // Reyting hisoblash: kurs ichidagi barcha o'quvchilar progressini olish
        const allProgress = await getAllProgressByCourse(courseId);
        setTotalStudentsInCourse(allProgress.length);

        if (prog && allProgress.length > 0) {
          // XP bo'yicha tartiblash (kattadan kichikka)
          const sorted = [...allProgress].sort((a, b) => (b.totalXP || 0) - (a.totalXP || 0));
          const rank = sorted.findIndex((p) => p.userId === user.uid) + 1;
          setUserRank(rank > 0 ? rank : allProgress.length);
        } else {
          setUserRank(allProgress.length > 0 ? allProgress.length + 1 : 1);
        }
      }

      // Har bir mavzudagi misol sonini olish (progress hisoblash uchun)
      const counts: Record<string, number> = {};
      for (const topic of t) {
        const problems = await getProblemsByTopic(courseId, topic.id);
        counts[topic.id] = problems.length;
      }
      setTopicProblemCounts(counts);

      // Motivatsion fraza yuklash
      try {
        const [phrases, settings] = await Promise.all([
          getMotivationPhrases("course"),
          getMotivationSettings("course"),
        ]);
        const activePhrases = phrases.filter((p) => p.isActive);
        if (activePhrases.length > 0) {
          const hours = settings?.rotateHours || 2;
          const isRandom = settings?.displayOrder === "random";
          if (isRandom) {
            const idx = Math.floor(Math.random() * activePhrases.length);
            setMotivationPhrase(activePhrases[idx].text);
          } else {
            // Ketma-ket: soatga qarab qaysi fraza ko'rinishini hisoblash
            const hoursSinceEpoch = Math.floor(Date.now() / (1000 * 60 * 60));
            const idx = Math.floor(hoursSinceEpoch / hours) % activePhrases.length;
            setMotivationPhrase(activePhrases[idx].text);
          }
        }
      } catch (err) {
        // Motivatsion frazalar ixtiyoriy — xatolik bo'lsa o'tkazib yuboramiz
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="page-content flex items-center justify-center"><div className="w-8 h-8 border-3 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  // Real progress hisoblash
  const completedTopics = userProgress?.completedTopics || [];
  const completedProblems = userProgress?.completedProblems || [];
  const totalProblems = Object.values(topicProblemCounts).reduce((a, b) => a + b, 0);
  const progressPercent = totalProblems > 0
    ? Math.round((completedProblems.length / totalProblems) * 100)
    : (topics.length > 0 ? Math.round((completedTopics.length / topics.length) * 100) : 0);

  return (
    <div className="page-content">
      {/* Header */}
      <header className="px-5 pt-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-900 truncate">{course?.title || "Kurs"}</h1>
        <div className="flex gap-3">
          <button className="text-gray-400"><Search size={20} /></button>
          <button className="text-gray-400"><Bell size={20} /></button>
        </div>
      </header>

      {/* Progress card */}
      <div className="mx-5 mt-4 bg-primary-500 rounded-2xl p-5">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <span className="text-white text-lg">🎓</span>
          </div>
          <div>
            <p className="text-white font-bold text-lg">{course?.title}</p>
            <p className="text-white/60 text-[10px] uppercase tracking-wide">Level {Math.ceil(progressPercent / 25)} Academic Path</p>
          </div>
        </div>

        {/* Progress percent & modullar */}
        <div className="flex items-end justify-between mb-3">
          <p className="text-white text-4xl font-bold">{progressPercent}%</p>
          <p className="text-white/80 text-sm font-medium">{completedTopics.length} / {topics.length} MODULLAR</p>
        </div>

        {/* Progress bar */}
        <div className="h-2.5 bg-white/20 rounded-full mb-4">
          <div className="h-full bg-white rounded-full transition-all" style={{ width: `${progressPercent}%` }} />
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/15 rounded-xl p-3">
            <p className="text-white/70 text-[10px] flex items-center gap-1">⭐ Umumiy ball</p>
            <p className="text-white text-xl font-bold">{userProgress?.totalXP || 0} XP</p>
          </div>
          <div className="bg-white/15 rounded-xl p-3">
            <p className="text-white/70 text-[10px] flex items-center gap-1">🏆 O'rni</p>
            <p className="text-white text-xl font-bold">
              {userRank !== null ? `${userRank}-o'rin` : "—"}
              {totalStudentsInCourse > 0 && <span className="text-sm font-normal text-white/60"> / {totalStudentsInCourse}</span>}
            </p>
          </div>
        </div>

        {/* Bottom info */}
        <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-white/60 text-xs">
          <span>Kursdagi o'quvchilar: {totalStudentsInCourse || course?.totalStudents || 0}</span>
          <span className="flex items-center gap-1">Hozir onlayn: {course?.onlineNow || 0} <span className="w-2 h-2 bg-green-400 rounded-full"></span></span>
        </div>
      </div>

      {/* Kursni tanishtirish */}
      {course?.introduction && course.introduction.text && (
        <CourseIntroCard introduction={course.introduction} />
      )}

      {/* Motivatsion fraza */}
      {motivationPhrase && (
        <div className="mx-5 mt-5 bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
          <span className="text-2xl mt-0.5">💡</span>
          <p className="text-sm text-gray-700 leading-relaxed italic">"{motivationPhrase}"</p>
        </div>
      )}

      {/* Mavzular */}
      <div className="px-5 mt-6 flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold">Mavzular va Testlar</h3>
      </div>

      <div className="px-5 space-y-3">
        {(() => {
          // Mavzular va testlarni bitta ro'yxatga birlashtirish (admin tartibi bo'yicha)
          type Item = { type: "topic"; data: Topic; order: number } | { type: "test"; data: Test; order: number } | { type: "advice"; data: Advice; order: number };
          const combined: Item[] = [];
          for (const topic of topics) {
            combined.push({ type: "topic", data: topic, order: topic.order });
          }
          for (const test of tests) {
            const order = test.afterTopicOrder != null ? test.afterTopicOrder + 0.5 : 99999;
            combined.push({ type: "test", data: test, order });
          }
          for (const adv of advices) {
            const order = adv.afterTopicOrder + 0.3;
            combined.push({ type: "advice", data: adv, order });
          }
          combined.sort((a, b) => a.order - b.order);

          return combined.map((item) => {
            if (item.type === "topic") {
              const topic = item.data as Topic;
              const isLocked = topic.isPremium && !hasSubscription;
              const totalP = topicProblemCounts[topic.id] || 0;
              const completedP = completedProblems.filter((pid) => pid.startsWith(`p-${topic.id.replace("topic-", "")}`)).length;
              const isTopicCompleted = completedTopics.includes(topic.id);
              const topicProgress = isLocked ? 0 : (isTopicCompleted ? 100 : (totalP > 0 ? Math.round((completedP / totalP) * 100) : 0));
              const isDone = !isLocked && (isTopicCompleted || topicProgress === 100);
              const isProgress = !isLocked && !isDone && topicProgress > 0;

              return (
                <Link
                  to={isLocked ? "/premium-gate" : `/course/${courseId}/topic/${topic.id}`}
                  key={`topic-${topic.id}`}
                  className="flex items-center border border-gray-100 rounded-xl p-4 gap-3 hover:shadow-sm transition-shadow"
                >
                  <div className="w-11 h-11 bg-primary-50 rounded-xl flex items-center justify-center shrink-0">
                    {isDone && <CheckCircle size={20} className="text-primary-500" />}
                    {isProgress && <Clock size={20} className="text-primary-500" />}
                    {isLocked && <Lock size={18} className="text-gray-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900 text-sm truncate">{topic.title}</p>
                      {isDone && <span className="text-green-500 text-xs">✓</span>}
                    </div>
                    <p className="text-xs text-gray-500 truncate">{topic.description}</p>
                    <div className="flex items-center mt-1.5">
                      <span className="text-[10px] text-gray-400 uppercase mr-2">Progress</span>
                      <div className="flex-1 h-1 bg-gray-100 rounded-full">
                        <div className="h-full bg-primary-500 rounded-full" style={{ width: `${topicProgress}%` }} />
                      </div>
                      <span className="text-xs font-medium text-gray-600 ml-2">{topicProgress}%</span>
                    </div>
                  </div>
                  <span className="text-gray-400">›</span>
                </Link>
              );
            } else if (item.type === "test") {
              const test = item.data as Test;
              const testLocked = test.isPremium && !hasSubscription;
              return (
                <Link
                  to={testLocked ? "/premium-gate" : `/test/${test.id}`}
                  key={`test-${test.id}`}
                  className={`flex items-center border rounded-xl p-4 gap-3 hover:shadow-sm transition-shadow ${testLocked ? "border-yellow-200 bg-yellow-50/30" : "border-orange-100 bg-orange-50/30"}`}
                >
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${testLocked ? "bg-yellow-100" : "bg-orange-100"}`}>
                    {testLocked ? <Lock size={18} className="text-yellow-500" /> : <FileText size={20} className="text-orange-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{test.title}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[10px] text-gray-500">❓ {test.questions?.length || 0} savol</span>
                      <span className="text-[10px] text-gray-500">⏱ {test.totalTime} daqiqa</span>
                      {testLocked
                        ? <span className="text-[10px] text-yellow-600 font-medium">🔒 Premium</span>
                        : <span className="text-[10px] text-orange-600 font-medium">Test</span>
                      }
                    </div>
                  </div>
                  <span className={`text-[11px] font-semibold px-3 py-1.5 rounded-lg shrink-0 ${testLocked ? "bg-yellow-500 text-white" : "bg-primary-500 text-white"}`}>
                    {testLocked ? "🔒 Sotib olish" : "Boshlash"}
                  </span>
                </Link>
              );
            } else {
              // Maslahat bloki
              const advice = item.data as Advice;
              return (
                <div
                  key={`advice-${advice.id}`}
                  className="flex items-start border border-blue-100 bg-blue-50/50 rounded-xl p-4 gap-3"
                >
                  <div className="w-11 h-11 bg-white rounded-xl flex items-center justify-center shrink-0 border border-blue-100">
                    <MessageSquare size={20} className="text-blue-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm">{advice.title}</p>
                    <p className="text-xs text-gray-600 mt-1 leading-relaxed">{advice.text}</p>
                  </div>
                </div>
              );
            }
          });
        })()}
      </div>

      {/* Kunlik test */}
      <div className="mx-5 mt-6 bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
        <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center shrink-0">
          <span className="text-white text-sm">✓</span>
        </div>
        <div>
          <p className="font-semibold text-gray-900 text-sm">Kunlik test mavjud!</p>
          <p className="text-xs text-gray-500">Bugungi topshiriqni bajaring va 50 XP oling.</p>
        </div>
      </div>
    </div>
  );
}


// ===== Kursni tanishtirish kartasi =====
function CourseIntroCard({ introduction }: { introduction: NonNullable<Course["introduction"]> }) {
  const [expanded, setExpanded] = useState(false);
  const [showVideo, setShowVideo] = useState(false);

  // YouTube thumbnail
  function getYouTubeThumbnail(url: string): string {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?]+)/);
    return match ? `https://img.youtube.com/vi/${match[1]}/mqdefault.jpg` : "";
  }

  // YouTube embed URL
  function getEmbedUrl(url: string): string {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?]+)/);
    const videoId = match ? match[1] : "";
    return `https://www.youtube.com/embed/${videoId}?autoplay=1`;
  }

  const thumbnail = introduction.thumbnailUrl || (introduction.videoType === "youtube" && introduction.videoUrl ? getYouTubeThumbnail(introduction.videoUrl) : "");

  return (
    <>
      <div className="mx-5 mt-5">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center border border-gray-100 rounded-xl p-4 gap-3 hover:shadow-sm transition-shadow bg-white"
        >
          {/* Thumbnail */}
          {thumbnail ? (
            <div className="relative w-16 h-12 rounded-lg overflow-hidden shrink-0 bg-gray-100">
              <img src={thumbnail} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                <div className="w-6 h-6 bg-white/90 rounded-full flex items-center justify-center">
                  <Play className="w-3 h-3 text-gray-800 ml-0.5" fill="currentColor" />
                </div>
              </div>
            </div>
          ) : (
            <div className="w-16 h-12 rounded-lg bg-primary-50 flex items-center justify-center shrink-0">
              <Play className="w-5 h-5 text-primary-500" />
            </div>
          )}

          {/* Text */}
          <div className="flex-1 min-w-0 text-left">
            <p className="font-semibold text-gray-900 text-sm">Kursni tanishtirish</p>
            <p className="text-xs text-gray-500 truncate">{introduction.text}</p>
          </div>

          {/* Expand chevron */}
          {expanded ? (
            <ChevronUp className="w-5 h-5 text-primary-500 shrink-0" />
          ) : (
            <ChevronDown className="w-5 h-5 text-primary-500 shrink-0" />
          )}
        </button>

        {/* Expanded content */}
        {expanded && (
          <div className="bg-white border border-t-0 border-gray-100 rounded-b-xl px-4 pb-4 -mt-1">
            <p className="text-sm text-gray-700 leading-relaxed mb-3">{introduction.text}</p>
            {introduction.videoUrl && (
              <button
                onClick={() => setShowVideo(true)}
                className="w-full flex items-center justify-center gap-2 py-3 bg-primary-50 text-primary-600 text-sm font-medium rounded-lg active:bg-primary-100"
              >
                <Play className="w-4 h-4" fill="currentColor" /> Videoni ko'rish
              </button>
            )}
          </div>
        )}
      </div>

      {/* Video Modal */}
      {showVideo && introduction.videoUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={() => setShowVideo(false)}>
          <div className="w-full max-w-lg mx-4 rounded-2xl overflow-hidden shadow-xl bg-black" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-3 bg-gray-900">
              <span className="text-white text-sm font-medium">Kursni tanishtirish</span>
              <button onClick={() => setShowVideo(false)} className="text-white/70 hover:text-white text-lg">✕</button>
            </div>
            <div className="aspect-video">
              {introduction.videoType === "youtube" || introduction.videoUrl.includes("youtube") || introduction.videoUrl.includes("youtu.be") ? (
                <iframe
                  src={getEmbedUrl(introduction.videoUrl)}
                  className="w-full h-full"
                  allowFullScreen
                  allow="autoplay; encrypted-media"
                />
              ) : (
                <video src={introduction.videoUrl} controls autoPlay className="w-full h-full" />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}