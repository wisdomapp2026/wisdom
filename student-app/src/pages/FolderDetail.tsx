import { Link, useParams } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import {
  getFolderById,
  getTopicsByCourse,
  getTestsByCourse,
  getAdviceByCourse,
  getProblemsByTopic,
  getUserProgress,
  markFolderPresence,
  clearFolderPresence,
  getFolderOnlineCount,
} from "@shared/repositories";
import type { Topic, Test, Advice, Folder, UserProgress } from "@shared/types";
import { ChevronLeft, CheckCircle, Clock, Lock, FileText, MessageSquare, Users } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useSubscription } from "../hooks/useSubscription";
import { getLocalCourseProgress } from "../hooks/useLocalProgress";
import { CourseDetailLoader } from "../components/PageLoader";

type FolderItem =
  | { type: "topic"; data: Topic; order: number }
  | { type: "test"; data: Test; order: number }
  | { type: "advice"; data: Advice; order: number };

export default function FolderDetail() {
  const { courseId, folderId } = useParams<{ courseId: string; folderId: string }>();
  const { user } = useAuth();
  const { isPremium: hasSubscription } = useSubscription();

  const [folder, setFolder] = useState<Folder | null>(null);
  const [items, setItems] = useState<FolderItem[]>([]);
  const [topicProblemCounts, setTopicProblemCounts] = useState<Record<string, number>>({});
  const [userProgress, setUserProgress] = useState<UserProgress | null>(null);
  const [onlineCount, setOnlineCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!courseId || !folderId) return;
    loadData();
  }, [courseId, folderId, user]);

  // Papka ochilganda — onlayn presence belgilash (heartbeat)
  useEffect(() => {
    if (!courseId || !folderId || !user?.uid) return;
    const isLocked = folder?.isPremium && !hasSubscription;
    if (isLocked) return;

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
      const [f, allTopics, allTests, allAdvices] = await Promise.all([
        getFolderById(courseId, folderId),
        getTopicsByCourse(courseId),
        getTestsByCourse(courseId),
        getAdviceByCourse(courseId),
      ]);
      setFolder(f);

      const topics = allTopics.filter((t) => !t.isHidden && t.folderId === folderId);
      const tests = allTests.filter((t) => t.status === "published" && t.folderId === folderId);
      const advices = allAdvices.filter((a) => a.folderId === folderId);

      const combined: FolderItem[] = [];
      for (const topic of topics) combined.push({ type: "topic", data: topic, order: topic.order });
      for (const test of tests) {
        const order = test.afterTopicOrder != null ? test.afterTopicOrder + 0.5 : 99999;
        combined.push({ type: "test", data: test, order });
      }
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
    const totalP = topicProblemCounts[topicId] || 0;
    if (totalP === 0) return completedTopics.includes(topicId);
    const doneP = completedProblems.filter((pid) => pid.startsWith(`p-${topicId.replace("topic-", "")}`)).length;
    return doneP >= totalP;
  }

  const totalTopics = items.filter((it) => it.type === "topic").length;
  const doneTopics = items.filter((it) => it.type === "topic" && isTopicCompleted((it.data as Topic).id)).length;
  const progress = totalTopics > 0 ? Math.round((doneTopics / totalTopics) * 100) : 0;

  function renderItem(item: FolderItem) {
    if (item.type === "topic") {
      const topic = item.data as Topic;
      const isLocked = topic.isPremium && !hasSubscription;
      const totalP = topicProblemCounts[topic.id] || 0;
      const completedP = completedProblems.filter((pid) => pid.startsWith(`p-${topic.id.replace("topic-", "")}`)).length;
      const isDoneFlag = completedTopics.includes(topic.id);
      const topicProgress = isLocked ? 0 : (isDoneFlag ? 100 : (totalP > 0 ? Math.round((completedP / totalP) * 100) : 0));
      const isDone = !isLocked && (isDoneFlag || topicProgress === 100);
      const isProgress = !isLocked && !isDone && topicProgress > 0;

      return (
        <Link
          to={isLocked ? "/premium-gate" : `/course/${courseId}/topic/${topic.id}`}
          key={`topic-${topic.id}`}
          className="flex items-center border border-gray-100 rounded-xl p-4 gap-3 hover:shadow-sm transition-shadow bg-white"
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
      {/* Header */}
      <header className="px-5 pt-4 pb-2 flex items-center gap-3">
        <Link to={`/course/${courseId}`} className="text-gray-500 shrink-0"><ChevronLeft size={22} /></Link>
        <h1 className="text-lg font-bold text-gray-900 truncate flex-1">{folder.title}</h1>
      </header>

      {/* Bo'lim kartasi — muqova + progress */}
      <div className="mx-5 mt-3 bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
        <div className="flex gap-3">
          <div className="w-20 h-28 rounded-xl overflow-hidden shrink-0 bg-gradient-to-br from-primary-100 to-primary-50 flex items-center justify-center relative">
            {folder.coverImage ? (
              <img src={folder.coverImage} alt={folder.title} className="w-full h-full object-cover" />
            ) : (
              <span className="text-4xl">{folder.icon || "📚"}</span>
            )}
          </div>
          <div className="flex-1 min-w-0 flex flex-col">
            {folder.description && (
              <p className="text-xs text-gray-500 leading-relaxed line-clamp-3">{folder.description}</p>
            )}
            <div className="flex items-center gap-3 mt-2 text-[11px] text-gray-500">
              <span className="flex items-center gap-1">
                📖 {totalTopics} dars{items.length - totalTopics > 0 ? ` · ${items.length - totalTopics} test` : ""}
              </span>
              {onlineCount > 0 && (
                <span className="flex items-center gap-1 text-green-600 font-medium">
                  <Users size={12} /> {onlineCount} onlayn
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                </span>
              )}
            </div>
            <div className="mt-auto pt-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-gray-400 uppercase tracking-wide">Progress</span>
                <span className="text-[11px] font-bold text-primary-600">{progress}%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-primary-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Ichidagi darslar/testlar */}
      <div className="px-5 mt-5 space-y-3">
        {items.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-10">Bu bo'lim hozircha bo'sh</p>
        ) : (
          items.map((item) => renderItem(item))
        )}
      </div>
    </div>
  );
}
