import { Link, useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import {
  getFolderById,
  getCourseById,
  getTopicsByCourse,
  getTestsByCourse,
  getAdviceByCourse,
  getProblemsByTopic,
  getUserProgress,
  markFolderPresence,
  clearFolderPresence,
  getFolderOnlineCount,
  enrollUserInCourse,
} from "@shared/repositories";
import type { Topic, Test, Advice, Folder, UserProgress } from "@shared/types";
import { ChevronLeft, ChevronRight, CheckCircle, Circle, Lock, FileText, MessageSquare, Play, BookOpen } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useCourseAccess } from "../hooks/useCourseAccess";
import { getLocalCourseProgress, enrollLocalCourse } from "../hooks/useLocalProgress";
import { CourseDetailLoader } from "../components/PageLoader";
import JoinCourseModal from "../components/JoinCourseModal";

type FolderItem =
  | { type: "topic"; data: Topic; order: number }
  | { type: "test"; data: Test; order: number }
  | { type: "advice"; data: Advice; order: number };

/** Topic title dan "N-modul:" qismini olib tashlab, "N-mavzu: Nom" formatida qaytaradi */
function cleanTopicTitle(title: string): string {
  // "4-modul: 4 - mavzu: Bo'linuvchanlik" → "4-mavzu: Bo'linuvchanlik"
  const fullMatch = title.match(/^\d+-modul:\s*(\d+)\s*-\s*mavzu:\s*(.*)/i);
  if (fullMatch) return `${fullMatch[1]}-mavzu: ${fullMatch[2]}`;
  // "5-mavzu: Matn" — allaqachon to'g'ri format
  if (/^\d+-mavzu:/i.test(title)) return title;
  // "5-modul: Matn" (mavzu so'zi yo'q) → "5-mavzu: Matn"
  const modulMatch = title.match(/^(\d+)-modul:\s*(.*)/i);
  if (modulMatch) return `${modulMatch[1]}-mavzu: ${modulMatch[2]}`;
  // Prefikssiz nom — topic.order bilan ko'rsatamiz (tashqaridan order beriladi)
  return title;
}

export default function FolderDetail() {
  const { courseId, folderId } = useParams<{ courseId: string; folderId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { hasAccess: hasSubscription, loading: accessLoading } = useCourseAccess(courseId);

  const [folder, setFolder] = useState<Folder | null>(null);
  const [unlockMode, setUnlockMode] = useState<"sequential" | "open">("open");
  const [items, setItems] = useState<FolderItem[]>([]);
  const [lockToast, setLockToast] = useState<string | null>(null);
  const [onlineCount, setOnlineCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [pendingTargetUrl, setPendingTargetUrl] = useState<string | null>(null);
  const [courseTitle, setCourseTitle] = useState("Kurs");
  const [topicProblemCounts, setTopicProblemCounts] = useState<Record<string, number>>({});
  const [userProgress, setUserProgress] = useState<UserProgress | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!courseId || !folderId) return;
    loadData();
  }, [courseId, folderId, user, hasSubscription, accessLoading]);

  // Papka ochilganda — onlayn presence belgilash (heartbeat)
  useEffect(() => {
    if (!courseId || !folderId || !user?.uid) return;

    let cancelled = false;
    async function beat() {
      try {
        await markFolderPresence(courseId!, folderId!, user!.uid);
        const cnt = await getFolderOnlineCount(courseId!, folderId!);
        if (!cancelled) setOnlineCount(cnt);
      } catch {
        // jim
      }
    }
    beat();
    heartbeatRef.current = setInterval(beat, 30000);
    return () => {
      cancelled = true;
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      clearFolderPresence(courseId!, folderId!, user!.uid).catch(() => {});
    };
  }, [courseId, folderId, user?.uid, folder, hasSubscription]);

  async function loadData() {
    if (!courseId || !folderId) return;
    try {
      const [f, course, allTopics, allTests, allAdvices] = await Promise.all([
        getFolderById(courseId, folderId),
        getCourseById(courseId),
        getTopicsByCourse(courseId),
        getTestsByCourse(courseId),
        getAdviceByCourse(courseId),
      ]);
      setFolder(f);
      setUnlockMode(course?.unlockMode || "open");
      if (course?.title) setCourseTitle(course.title);

      const topics = allTopics.filter((t) => !t.isHidden && t.folderId === folderId);
      const advices = allAdvices.filter((a) => a.folderId === folderId);
      // Faqat mavzu ichiga tegishli bo'lmagan testlarni ko'rsatish (afterTopicOrder bor bo'lsa — u mavzu ichida ko'rinadi)
      const tests = allTests.filter((t) => t.status === "published" && t.folderId === folderId && t.afterTopicOrder == null);

      // Agar papka premium bo'lsa va unda birorta ham bepul dars bo'lmasa, hamda o'quvchida obuna bo'lmasa — obuna sotib olish sahifasiga yo'naltiramiz
      const hasFreeTopic = topics.some((t) => !t.isPremium);
      if (f?.isPremium && !hasFreeTopic && !hasSubscription && !accessLoading) {
        navigate(`/premium-gate?course=${courseId}`, { replace: true });
        return;
      }

      const combined: FolderItem[] = [];
      for (const topic of topics) combined.push({ type: "topic", data: topic, order: topic.order });
      for (const test of tests) combined.push({ type: "test", data: test, order: (test.afterTopicOrder ?? 99999) + 0.5 });
      for (const adv of advices) combined.push({ type: "advice", data: adv, order: adv.afterTopicOrder + 0.3 });
      combined.sort((a, b) => a.order - b.order);
      setItems(combined);

      // Har bir topic ichidagi misollar sonini olish (progress hisoblash uchun)
      const counts: Record<string, number> = {};
      await Promise.all(
        topics.map(async (topic) => {
          const problems = await getProblemsByTopic(courseId, topic.id);
          counts[topic.id] = problems.length;
        })
      );
      setTopicProblemCounts(counts);

      // Progress
      if (user) {
        const prog = await getUserProgress(user.uid, courseId);
        setUserProgress(prog);
      } else {
        setUserProgress(getLocalCourseProgress(courseId));
      }

      // Boshlang'ich onlayn son (heartbeat boshlanishidan oldin ko'rsatish uchun)
      try {
        const cnt = await getFolderOnlineCount(courseId, folderId);
        setOnlineCount(cnt);
      } catch {}
    } catch (err) {
      console.error("Bo'lim ma'lumotlarini yuklashda xatolik:", err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <CourseDetailLoader />;
  }

  if (!folder) {
    return (
      <div className="page-content flex items-center justify-center min-h-screen">
        <p className="text-gray-400">Bo'lim topilmadi</p>
      </div>
    );
  }

  const completedTopics = userProgress?.completedTopics || [];
  const completedProblems = userProgress?.completedProblems || [];

  function isTopicCompleted(topicId: string): boolean {
    return completedTopics.includes(topicId);
  }

  const totalTopics = items.filter((it) => it.type === "topic").length;
  const totalTests = items.filter((it) => it.type === "test").length;
  const doneTopics = items.filter((it) => it.type === "topic" && isTopicCompleted((it.data as Topic).id)).length;
  const progress = totalTopics > 0 ? Math.round((doneTopics / totalTopics) * 100) : 0;

  // Davom etish uchun keyingi tugatilmagan mavzu (yoki birinchi mavzu)
  const topicItems = items.filter((it) => it.type === "topic") as Array<{ type: "topic"; data: Topic; order: number }>;
  const nextTopic =
    topicItems.find((it) => !isTopicCompleted(it.data.id))?.data ||
    topicItems[0]?.data ||
    null;
  const currentTopicTitle = nextTopic ? cleanTopicTitle(nextTopic.title) : "";
  const continueLink = nextTopic ? `/course/${courseId}/topic/${nextTopic.id}` : null;

  function renderItem(item: FolderItem, itemIndex: number) {
    if (item.type === "topic") {
      const topic = item.data as Topic;
      const topicPremiumLocked = topic.isPremium && !hasSubscription;

      let sequenceLocked = false;
      if (unlockMode === "sequential" && itemIndex > 0) {
        const prevTopics = items.slice(0, itemIndex).filter((it) => it.type === "topic");
        const lastPrevTopic = prevTopics[prevTopics.length - 1];
        if (lastPrevTopic) {
          const prevId = (lastPrevTopic.data as Topic).id;
          if (!completedTopics.includes(prevId)) {
            sequenceLocked = true;
          }
        }
      }

      const isLocked = topicPremiumLocked || sequenceLocked;
      const totalP = topicProblemCounts[topic.id] || 0;
      const completedP = completedProblems.filter((pid) => pid.startsWith(`p-${topic.id.replace("topic-", "")}`)).length;
      const isDoneFlag = completedTopics.includes(topic.id);
      const topicProgress = isLocked ? 0 : (isDoneFlag ? 100 : (totalP > 0 ? Math.round((completedP / totalP) * 100) : 0));
      const isDone = !isLocked && (isDoneFlag || topicProgress === 100);
      const isProgress = !isLocked && !isDone && topicProgress > 0;

      const isEnrolled = !!(userProgress && (userProgress.isJoined || userProgress.completedTopics?.length || userProgress.enrolledAt));

      return (
        <Link
          to={topicPremiumLocked ? `/premium-gate?course=${courseId}` : sequenceLocked ? "#" : `/course/${courseId}/topic/${topic.id}`}
          onClick={(e) => {
            if (!topicPremiumLocked && !sequenceLocked && !isEnrolled) {
              e.preventDefault();
              setPendingTargetUrl(`/course/${courseId}/topic/${topic.id}`);
              setShowJoinModal(true);
              return;
            }
            if (sequenceLocked && !topicPremiumLocked) {
              e.preventDefault();
              setLockToast("Avvalgi mavzuni tugatmasdan keyingisiga o'tib bo'lmaydi");
              setTimeout(() => setLockToast(null), 3000);
            }
          }}
          key={`topic-${topic.id}`}
          className={`flex items-center border rounded-2xl p-3 gap-3 hover:shadow-sm transition-shadow shadow-sm ${
            topicPremiumLocked ? "bg-yellow-50/40 border-yellow-200" : "bg-white border-gray-100"
          }`}
        >
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${topicPremiumLocked ? "bg-yellow-100" : isProgress ? "bg-orange-50" : "bg-primary-50"}`}>
            {topicPremiumLocked ? (
              <Lock size={18} className="text-yellow-600" />
            ) : isLocked ? (
              <Lock size={18} className="text-gray-400" />
            ) : isDone ? (
              <CheckCircle size={20} className="text-primary-500" />
            ) : isProgress ? (
              <FileText size={20} className="text-orange-400" />
            ) : (
              <Circle size={20} className="text-primary-300" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="font-semibold text-gray-900 text-sm leading-snug truncate">{cleanTopicTitle(topic.title)}</p>
              {topic.isPremium && <span className="shrink-0 text-yellow-500 text-xs">👑</span>}
            </div>
            <div className="flex items-center mt-1.5 gap-2">
              <span className="text-[9px] text-gray-400 uppercase tracking-wide shrink-0">Progress</span>
              <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-primary-500 rounded-full transition-all" style={{ width: `${topicProgress}%` }} />
              </div>
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-1.5">
            {topicPremiumLocked ? (
              <span className="text-[11px] font-semibold text-white bg-yellow-500 px-2.5 py-1 rounded-lg flex items-center gap-1">
                <Lock size={12} /> Premium
              </span>
            ) : isDone ? (
              <div className="flex flex-col items-end">
                <span className="text-green-500 text-sm leading-none">✓</span>
                <span className="text-[11px] font-semibold text-gray-600 mt-0.5">100%</span>
              </div>
            ) : isProgress ? (
              <div className="relative w-9 h-9">
                <svg className="w-9 h-9" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="15" fill="none" stroke="#e5e7eb" strokeWidth="4" />
                  <circle
                    cx="18" cy="18" r="15" fill="none" stroke="#3b82f6" strokeWidth="4"
                    strokeDasharray={`${(topicProgress / 100) * 94.2} 94.2`}
                    strokeLinecap="round"
                    transform="rotate(-90 18 18)"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-primary-600">
                  {topicProgress}%
                </span>
              </div>
            ) : (
              <span className="text-[11px] font-semibold text-gray-400">{topicProgress}%</span>
            )}
            <ChevronRight className="w-4 h-4 text-gray-300" />
          </div>
        </Link>
      );
    } else if (item.type === "test") {
      const test = item.data as Test;
      const testLocked = test.isPremium && !hasSubscription;
      return (
        <Link
          to={testLocked ? `/premium-gate?course=${courseId}` : `/test/${test.id}`}
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
  }

  return (
    <div className="page-content">
      <header className="px-5 pt-4 pb-2 flex items-center gap-3">
        <Link to={`/course/${courseId}`} className="text-gray-500 shrink-0 flex items-center justify-center"><ChevronLeft size={22} /></Link>
        <h1 className="text-lg font-bold text-gray-900 flex-1 leading-tight">{folder.title}</h1>
        <div className="shrink-0 flex items-center gap-1.5 bg-white border border-gray-200 rounded-full px-3 py-1.5 shadow-sm">
          <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="15" fill="none" stroke="#e5e7eb" strokeWidth="6" />
            <circle
              cx="18" cy="18" r="15" fill="none" stroke="#3b82f6" strokeWidth="6"
              strokeDasharray={`${(progress / 100) * 94.2} 94.2`}
              strokeLinecap="round"
              transform="rotate(-90 18 18)"
            />
          </svg>
          <span className="text-xs font-semibold text-gray-700 whitespace-nowrap">{progress}% bajarildi</span>
        </div>
      </header>

      <div className="mx-5 mt-3 bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
        <div className="flex gap-4 items-center">
          <div className="w-24 h-24 rounded-2xl overflow-hidden shrink-0 bg-gradient-to-br from-blue-50 to-primary-50 flex items-center justify-center">
            {folder.coverImage ? (
              <img src={folder.coverImage} alt={folder.title} className="w-full h-full object-cover" />
            ) : (
              <span className="text-4xl">{folder.icon || "📚"}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="inline-flex items-center gap-1.5 bg-primary-50 text-primary-600 rounded-md px-2 py-1 mb-2">
              <Play className="w-3 h-3 fill-current" />
              <span className="text-[10px] font-bold uppercase tracking-wide">Davom eting</span>
            </div>
            <h2 className="text-base font-bold text-gray-900 leading-snug">
              {currentTopicTitle || folder.title}
            </h2>
            <p className="text-xs text-gray-400 mt-1">Siz to'xtagan joyingizdan davom eting</p>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-primary-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-sm font-bold text-primary-500">{progress}%</span>
              <span className="text-xs text-gray-400">{totalTopics} dars</span>
            </div>
          </div>
          {continueLink && (
            <Link
              to={continueLink}
              onClick={(e) => {
                 const isEnrolled = !!(userProgress && (userProgress.isJoined || userProgress.completedTopics?.length || userProgress.enrolledAt));
                 if (!isEnrolled) {
                   e.preventDefault();
                   setPendingTargetUrl(continueLink);
                   setShowJoinModal(true);
                 }
              }}
              className="shrink-0 flex items-center gap-1.5 bg-primary-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-sm active:scale-[0.97] transition-transform"
            >
              <Play className="w-4 h-4 fill-current" />
              Davom etish
            </Link>
          )}
        </div>
      </div>

      <div className="mx-5 mt-3 bg-white border border-gray-100 rounded-2xl px-4 py-3 shadow-sm">
        <div className="flex items-center justify-around">
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-base font-bold text-gray-900">{totalTopics}</span>
            <span className="text-[10px] text-gray-400 uppercase tracking-wide">dars</span>
          </div>
          <div className="w-px h-8 bg-gray-100" />
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-base font-bold text-gray-900">{totalTests}</span>
            <span className="text-[10px] text-gray-400 uppercase tracking-wide">test</span>
          </div>
          <div className="w-px h-8 bg-gray-100" />
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-base font-bold text-green-600 flex items-center gap-1">
              {onlineCount}
              {onlineCount > 0 && <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />}
            </span>
            <span className="text-[10px] text-gray-400 uppercase tracking-wide">onlayn</span>
          </div>
        </div>
      </div>

      <div className="px-5 mt-5 flex items-center">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-primary-500" />
          <h3 className="text-base font-bold text-gray-900">Mavzular</h3>
        </div>
      </div>

      <div className="px-5 mt-3 space-y-2.5">
        {items.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-10">Bu bo'lim hozircha bo'sh</p>
        ) : (
          items.filter((it) => it.type !== "test").map((item, idx) => renderItem(item, idx))
        )}
      </div>

      {/* Testlar bo'limi — alohida */}
      {items.filter((it) => it.type === "test").length > 0 && (
        <>
          <div className="px-5 mt-6 flex items-center">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-orange-500" />
              <h3 className="text-base font-bold text-gray-900">Testlar</h3>
            </div>
          </div>
          <div className="px-5 mt-3 space-y-2.5">
            {items.filter((it) => it.type === "test").map((item, idx) => renderItem(item, idx))}
          </div>
        </>
      )}

      {lockToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white text-xs font-medium px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 max-w-[85%] animate-fadeIn">
          <Lock size={14} className="shrink-0 text-yellow-400" />
          <span>{lockToast}</span>
        </div>
      )}

      <JoinCourseModal
        open={showJoinModal}
        courseTitle={courseTitle}
        onClose={() => setShowJoinModal(false)}
        onConfirm={async () => {
          if (!courseId) return;
          if (!user) {
            setShowJoinModal(false);
            const returnPath = pendingTargetUrl || `/course/${courseId}/folder/${folderId}`;
            navigate(`/login?returnTo=${encodeURIComponent(returnPath)}`);
            return;
          }
          await enrollUserInCourse(user.uid, courseId);
          setUserProgress((prev) => prev ? { ...prev, isJoined: true } : { id: `prog_${user.uid}_${courseId}`, userId: user.uid, courseId, completedTopics: [], completedProblems: [], progressPercent: 0, totalXP: 0, streak: 0, weeklyMinutes: [0, 0, 0, 0, 0, 0, 0], lastAccessedAt: Date.now(), isJoined: true });
          setShowJoinModal(false);
          if (pendingTargetUrl) {
            const url = pendingTargetUrl;
            setPendingTargetUrl(null);
            navigate(url);
          }
        }}
      />
    </div>
  );
}
