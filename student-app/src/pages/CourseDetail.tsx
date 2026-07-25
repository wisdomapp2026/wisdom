import { Link, useParams, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { getCourseById, getTopicsByCourse, getTestsByCourse, getUserProgress, setUserProgress, getProblemsByTopic, getAllProgressByCourse, getAdviceByCourse, getMotivationPhrases, getMotivationSettings, getActiveCourseLinks, getFoldersByCourse, getFolderOnlineCount } from "@shared/repositories";
import type { Course, Topic, Test, UserProgress, Advice, MotivationalPhrase, MotivationSettings, SocialLink, Folder } from "@shared/types";
import { Search, Bell, CheckCircle, Clock, Lock, FileText, Play, ChevronDown, ChevronUp, ChevronRight, MessageSquare, ExternalLink, Users, UserPlus, Download } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useSubscription } from "../hooks/useSubscription";
import { CourseDetailLoader } from "../components/PageLoader";
import NotificationBell from "../components/NotificationBell";
import { getLocalCourseProgress, enrollLocalCourse, setLocalCourseProgress } from "../hooks/useLocalProgress";
import { cachedFetch } from "../hooks/useCache";
import LatexText from "../components/LatexText";

export default function CourseDetail() {
  const { courseId } = useParams<{ courseId: string }>();
  const location = useLocation();
  const { user } = useAuth();
  const { isPremium: hasSubscription } = useSubscription();
  const [course, setCourse] = useState<Course | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [tests, setTests] = useState<Test[]>([]);
  const [advices, setAdvices] = useState<Advice[]>([]);
  const [loading, setLoading] = useState(() => {
    return !courseId || localStorage.getItem(`edukids_cache_course-${courseId}`) === null;
  });
  const [userProgress, setUserProgressState] = useState<UserProgress | null>(null);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [enrollChecked, setEnrollChecked] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [topicProblemCounts, setTopicProblemCounts] = useState<Record<string, number>>({});
  const [userRank, setUserRank] = useState<number | null>(null);
  const [totalStudentsInCourse, setTotalStudentsInCourse] = useState(0);
  const [motivationPhrase, setMotivationPhrase] = useState<string>("");
  const [courseSocialLinks, setCourseSocialLinks] = useState<SocialLink[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [folderOnlineCounts, setFolderOnlineCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!courseId) return;
    loadData();
  }, [courseId, user, location.key]);

  // Sahifa qayta ko'ringanda (TopicDetail dan qaytganda) progressni yangilash
  useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState === "visible" && courseId) {
        refreshProgress();
      }
    }
    // Sahifa focus bo'lganda ham
    function handleFocus() {
      if (courseId) refreshProgress();
    }
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", handleFocus);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", handleFocus);
    };
  }, [courseId, user]);

  /** Faqat progressni yangilash (butun sahifani reload qilmaslik) */
  async function refreshProgress() {
    if (!courseId) return;
    if (user) {
      const prog = await getUserProgress(user.uid, courseId);
      setUserProgressState(prog);
      setIsEnrolled(!!prog);
    } else {
      const localProg = getLocalCourseProgress(courseId);
      setUserProgressState(localProg);
      setIsEnrolled(!!localProg);
    }
  }

  async function loadData() {
    if (!courseId) return;
    try {
      const [c, t, te] = await Promise.all([
        cachedFetch(`course-${courseId}`, () => getCourseById(courseId)),
        getTopicsByCourse(courseId), // Keshsiz — har safar yangi topiklar soni olinishi uchun
        cachedFetch(`tests-${courseId}`, () => getTestsByCourse(courseId)),
      ]);
      setCourse(c);
      setTopics((t || []).filter(x => !x.isHidden));
      setTests(te.filter(x => x.status === "published"));

      // Maslahat bloklarini yuklash
      const adv = await getAdviceByCourse(courseId);
      setAdvices(adv);

      // Kurs ijtimoiy tarmoqlarini yuklash
      const slinks = await getActiveCourseLinks(courseId);
      setCourseSocialLinks(slinks);

      // Papkalarni yuklash (yashirilganlarni chiqarib tashlash)
      const fdrs = await getFoldersByCourse(courseId);
      setFolders(fdrs.filter(f => !f.isHidden));

      // Papkalardagi onlayn userlar sonini yuklash
      const onlineCounts: Record<string, number> = {};
      await Promise.all(
        fdrs.map(async (f) => {
          onlineCounts[f.id] = await getFolderOnlineCount(courseId, f.id);
        })
      );
      setFolderOnlineCounts(onlineCounts);

      // User progress — HAR SAFAR yangi olish (cache'siz, chunki TopicDetail o'zgartiradi)
      if (user) {
        const prog = await getUserProgress(user.uid, courseId);
        setUserProgressState(prog);
        setIsEnrolled(!!prog);
        setEnrollChecked(true);

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
      } else {
        // Login qilmagan — local progress tekshirish
        const localProg = getLocalCourseProgress(courseId);
        setUserProgressState(localProg);
        setIsEnrolled(!!localProg);
        setEnrollChecked(true);

        // Reyting uchun barcha progressni olish
        const allProgress = await getAllProgressByCourse(courseId);
        setTotalStudentsInCourse(allProgress.length);
      }

      // Har bir moduldagi misol sonini olish (progress hisoblash uchun)
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
    return <CourseDetailLoader />;
  }

  // Real progress hisoblash
  // completedTopics — o'quvchi KIRGAN topiklar (TopicDetail.saveProgress da yoziladi)
  // completedProblems — yechimi ko'rilgan misollar
  const completedTopics = userProgress?.completedTopics || [];
  const completedProblems = userProgress?.completedProblems || [];

  // Modul "tugatilgan" — o'quvchi shu topikka kirgan (TopicDetail.saveProgress() saqlaydi)
  // completedTopics da bor = kirilgan = tugatilgan
  function isTopicCompleted(topicId: string): boolean {
    return completedTopics.includes(topicId);
  }

  // BARCHA topiklar (papkali va papkasiz) — bu haqiqiy "darslar soni"
  const totalTopicsCount = topics.length;
  const realCompletedCount = topics.filter((t) => isTopicCompleted(t.id)).length;

  // Progress hisoblash:
  // Agar papkalar bor bo'lsa — progress = tugatilgan papkalar / jami papkalar
  // Agar papkalar yo'q bo'lsa — progress = tugatilgan topiklar / jami topiklar
  // Papka "tugatilgan" = shu papkadagi BARCHA topiklar tugatilgan
  const hasFolders = folders.length > 0;

  function isFolderCompleted(folderId: string): boolean {
    const folderTopics = topics.filter((t) => t.folderId === folderId);
    if (folderTopics.length === 0) return false; // Bo'sh papka tugatilgan emas
    return folderTopics.every((t) => isTopicCompleted(t.id));
  }

  // "Modullar" soni — papkalar bor bo'lsa papkalar soni, aks holda topiklar soni
  const totalModules = hasFolders ? folders.length : totalTopicsCount;
  const completedModules = hasFolders
    ? folders.filter((f) => isFolderCompleted(f.id)).length
    : realCompletedCount;

  const progressPercent = totalModules > 0
    ? Math.round((completedModules / totalModules) * 100)
    : 0;

  // Bitta papkadagi progress (shu papkadagi modullar tugatilishiga qarab)
  function getFolderProgress(folderId: string): number {
    const folderTopics = topics.filter((t) => t.folderId === folderId);
    if (folderTopics.length === 0) return 0;
    const doneCount = folderTopics.filter((t) => isTopicCompleted(t.id)).length;
    return Math.round((doneCount / folderTopics.length) * 100);
  }

  // Bitta element (modul/test/maslahat) ni render qilish
  type RenderableItem = { type: "topic"; data: Topic; order: number } | { type: "test"; data: Test; order: number } | { type: "advice"; data: Advice; order: number };
  function renderItem(item: RenderableItem) {
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

  // Kursga qo'shilish funksiyasi
  async function handleEnroll() {
    if (!courseId) return;
    setEnrolling(true);
    try {
      if (user) {
        // Login qilgan — DB ga yozish
        const now = Date.now();
        const progress: UserProgress = {
          id: `${user.uid}_${courseId}`,
          userId: user.uid,
          courseId,
          completedTopics: [],
          completedProblems: [],
          progressPercent: 0,
          totalXP: 0,
          streak: 0,
          weeklyMinutes: [0, 0, 0, 0, 0, 0, 0],
          lastAccessedAt: now,
        };
        await setUserProgress(progress);
        setUserProgressState(progress);
      } else {
        // Login qilmagan — localStorage ga saqlash
        const progress = enrollLocalCourse(courseId);
        setUserProgressState(progress);
      }
      setIsEnrolled(true);
    } catch (err) {
      console.error("Kursga qo'shilishda xatolik:", err);
    } finally {
      setEnrolling(false);
    }
  }

  return (
    <div className="page-content">
      {/* Header */}
      <header className="px-5 pt-4 pb-2 flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-900 truncate flex-1 mr-2">{course?.title || "Kurs"}</h1>
        <div className="flex items-center gap-1 shrink-0">
          <button className="w-10 h-10 flex items-center justify-center text-gray-500 rounded-xl" aria-label="Qidirish"><Search size={20} /></button>
          <NotificationBell />
        </div>
      </header>

      {/* Kursga qo'shilish yoki Progress card */}
      {!enrollChecked ? null : !isEnrolled ? (
        <div className="mx-5 mt-4 bg-white border border-gray-200 rounded-2xl p-6 text-center">
          {course?.coverImage && (
            <div className="h-32 -mx-6 -mt-6 mb-4 rounded-t-2xl overflow-hidden">
              <img src={course.coverImage} alt="" className="w-full h-full" style={{ objectFit: course.coverFit || "cover", objectPosition: course.coverPosition || "50% 50%" }} />
            </div>
          )}
          <h3 className="text-lg font-bold text-gray-900 mb-1">{course?.title}</h3>
          <p className="text-sm text-gray-500 mb-4">{course?.description}</p>
          <div className="flex items-center justify-center gap-4 text-sm text-gray-500 mb-5">
            <span>📚 {hasFolders ? folders.length : topics.length} modul</span>
            <span>👥 {totalStudentsInCourse} o'quvchi</span>
          </div>
          <button
            onClick={handleEnroll}
            disabled={enrolling}
            className="w-full bg-primary-500 text-white py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 hover:bg-primary-600 active:scale-95 transition-all disabled:opacity-70"
          >
            {enrolling ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <UserPlus size={18} />
                Kursga qo'shilish
              </>
            )}
          </button>
          {!user && <p className="text-[10px] text-gray-400 mt-2">Ro'yxatdan o'tmasdan ham boshlay olasiz</p>}
        </div>
      ) : (
      <div className="mx-5 mt-4 bg-primary-500 rounded-2xl p-5">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
            <span className="text-white text-lg">🎓</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-white font-bold text-lg leading-tight truncate">{course?.title}</p>
            <p className="text-white/60 text-[10px] uppercase tracking-wide mt-0.5">
              {(() => {
                const currentTopic = userProgress?.currentTopicId
                  ? topics.find((t) => t.id === userProgress.currentTopicId)
                  : null;
                return currentTopic ? currentTopic.title : `Level ${Math.ceil(progressPercent / 25)} Academic Path`;
              })()}
            </p>
          </div>
        </div>

        {/* Progress percent & modullar */}
        <div className="flex items-end justify-between mb-3">
          <p className="text-white text-4xl font-bold">{progressPercent}%</p>
          <p className="text-white/80 text-sm font-medium">{completedModules} / {totalModules} MODULLAR</p>
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
      )}

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

      {/* Modullar */}
      <div className="px-5 mt-6 flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold">Modullar va Testlar</h3>
      </div>

      <div className="px-5 space-y-3">
        {(() => {
          // Modullar, testlar va maslahatlarni bitta ro'yxatga birlashtirish (admin tartibi bo'yicha)
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

          const getFolderId = (item: Item) => (item.data as Topic | Test | Advice).folderId;

          // Papkali va papkasiz elementlar
          const looseItems = combined.filter((it) => !getFolderId(it));

          return (
            <>
              {/* Papkalar */}
              {folders.map((folder) => {
                const folderItems = combined.filter((it) => getFolderId(it) === folder.id);
                return (
                  <FolderBlock
                    key={folder.id}
                    folder={folder}
                    folderItems={folderItems}
                    hasSubscription={hasSubscription}
                    progress={getFolderProgress(folder.id)}
                    onlineCount={folderOnlineCounts[folder.id] || 0}
                    courseId={courseId!}
                  />
                );
              })}

              {/* Papkasiz elementlar */}
              {looseItems.map((item) => renderItem(item))}
            </>
          );
        })()}
      </div>

      {/* Kurs ijtimoiy tarmoqlari */}
      {courseSocialLinks.length > 0 && (
        <CourseSocialLinksCard links={courseSocialLinks} />
      )}
    </div>
  );
}


// ===== Kursni tanishtirish kartasi =====
function CourseIntroCard({ introduction }: { introduction: NonNullable<Course["introduction"]> }) {
  // Videodan keyingi matn (izoh) — akkordion, yopiq holatda boshlanadi
  const [textExpanded, setTextExpanded] = useState(false);
  // Video sahifaning o'zida ko'rsatiladi (modal emas), doim ochiq turadi — bosilgach pleer ishga tushadi
  const [videoPlaying, setVideoPlaying] = useState(false);

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
  const isYoutube = introduction.videoType === "youtube" || !!introduction.videoUrl?.includes("youtube") || !!introduction.videoUrl?.includes("youtu.be");

  return (
    <div className="mx-5 mt-5 bg-white border border-gray-100 rounded-xl p-4">
      {/* Sarlavha */}
      <div className="flex items-center gap-2 mb-3">
        <Play className="w-4 h-4 text-primary-500" />
        <p className="font-semibold text-gray-900 text-sm">Kursni tanishtirish</p>
      </div>

      {/* Qisqa matn */}
      <p className="text-sm text-gray-700 leading-relaxed mb-3">{introduction.text}</p>

      {introduction.imageUrl && (
        <div className="mb-3 rounded-lg overflow-hidden">
          <img src={introduction.imageUrl} alt="Kurs tanishtirish" className="w-full max-h-48 object-cover rounded-lg" />
        </div>
      )}

      {/* Video — doim ochiq ko'rinadi (akkordion emas) */}
      {introduction.videoUrl && (
        <>
          {!videoPlaying ? (
            <button
              onClick={() => setVideoPlaying(true)}
              className="w-full relative rounded-lg overflow-hidden bg-black aspect-video flex items-center justify-center group"
            >
              {thumbnail ? (
                <img src={thumbnail} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gray-900" />
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-active:bg-black/40 transition-colors">
                <div className="w-14 h-14 bg-white/95 rounded-full flex items-center justify-center shadow-lg">
                  <Play className="w-6 h-6 text-primary-600 ml-0.5" fill="currentColor" />
                </div>
              </div>
              <span className="absolute bottom-2 left-2 text-white text-xs font-medium bg-black/50 px-2 py-1 rounded">Videoni ko'rish</span>
            </button>
          ) : (
            <div className="w-full rounded-lg overflow-hidden bg-black aspect-video">
              {isYoutube ? (
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
          )}
        </>
      )}

      {/* Videodan keyingi matn — akkordion (drop-down), admin yozgan, LaTeX formulalarni qo'llab-quvvatlaydi */}
      {introduction.afterVideoText && (
        <div className="mt-3">
          <button
            onClick={() => setTextExpanded(!textExpanded)}
            className="w-full flex items-center justify-between gap-2 py-2.5 border-t border-gray-100"
          >
            <span className="text-sm font-medium text-gray-700">Batafsil izoh</span>
            {textExpanded ? (
              <ChevronUp className="w-4 h-4 text-primary-500 shrink-0" />
            ) : (
              <ChevronDown className="w-4 h-4 text-primary-500 shrink-0" />
            )}
          </button>
          {textExpanded && (
            <div className="pb-1 overflow-hidden">
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                <LatexText text={introduction.afterVideoText} />
              </p>
            </div>
          )}
        </div>
      )}

      {/* Biriktirilgan fayl — student yuklab olishi mumkin */}
      {introduction.attachedFileUrl && (
        <a
          href={introduction.attachedFileUrl}
          target="_blank"
          rel="noopener noreferrer"
          download={introduction.attachedFileName}
          className="mt-3 flex items-center gap-3 px-4 py-3 bg-orange-50 border border-orange-100 rounded-lg active:bg-orange-100 transition-colors"
        >
          <FileText className="w-5 h-5 text-orange-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{introduction.attachedFileName || "Biriktirilgan fayl"}</p>
            <p className="text-[11px] text-gray-500">Yuklab olish uchun bosing</p>
          </div>
          <Download className="w-4 h-4 text-orange-500 shrink-0" />
        </a>
      )}
    </div>
  );
}


// ===== Kurs Ijtimoiy Tarmoqlari =====
const PLATFORM_META: Record<string, { label: string; color: string; icon: string }> = {
  telegram: { label: "Telegram", color: "#0088cc", icon: "✈️" },
  instagram: { label: "Instagram", color: "#E4405F", icon: "📸" },
  youtube: { label: "YouTube", color: "#FF0000", icon: "▶️" },
  facebook: { label: "Facebook", color: "#1877F2", icon: "📘" },
  tiktok: { label: "TikTok", color: "#000000", icon: "🎵" },
  twitter: { label: "Twitter", color: "#1DA1F2", icon: "🐦" },
  linkedin: { label: "LinkedIn", color: "#0A66C2", icon: "💼" },
  website: { label: "Veb-sayt", color: "#6B7280", icon: "🌐" },
};

function CourseSocialLinksCard({ links }: { links: SocialLink[] }) {
  return (
    <div className="mx-5 mt-6">
      <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
        🌐 Ijtimoiy tarmoqlar
      </h3>
      <div className="grid grid-cols-2 gap-2">
        {links.map((link) => {
          const meta = PLATFORM_META[link.platform] || PLATFORM_META.website;
          return (
            <a
              key={link.id}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 p-3 bg-white border border-gray-100 rounded-xl hover:shadow-sm active:scale-[0.98] transition-all"
            >
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-base overflow-hidden"
                style={{ backgroundColor: link.iconUrl ? "transparent" : meta.color + "15" }}
              >
                {link.iconUrl ? (
                  <img src={link.iconUrl} alt="" className="w-9 h-9 object-cover rounded-full" />
                ) : (
                  meta.icon
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 truncate">{link.label}</p>
                <p className="text-[10px] truncate" style={{ color: meta.color }}>{meta.label}</p>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-gray-300 shrink-0" />
            </a>
          );
        })}
      </div>
    </div>
  );
}


// ===== Papka bloki (kitob — card ko'rinishida) =====
type FolderItem = { type: "topic"; data: Topic; order: number } | { type: "test"; data: Test; order: number } | { type: "advice"; data: Advice; order: number };

function FolderBlock({
  folder,
  folderItems,
  hasSubscription,
  progress,
  onlineCount,
  courseId,
}: {
  folder: Folder;
  folderItems: FolderItem[];
  hasSubscription: boolean;
  progress: number;
  onlineCount: number;
  courseId: string;
}) {
  const isLocked = folder.isPremium && !hasSubscription;
  const totalTopics = folderItems.filter((it) => it.type === "topic").length;

  return (
    <Link
      to={isLocked ? "/premium-gate" : `/course/${courseId}/folder/${folder.id}`}
      className="block border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-sm hover:shadow-md active:bg-gray-50 transition-all"
    >
      {/* Card — muqova + ma'lumot. Bosilganda alohida sahifa ochiladi */}
      <div className="w-full flex gap-3 p-3 text-left">
        {/* Muqova */}
        <div className="w-20 h-28 rounded-xl overflow-hidden shrink-0 bg-gradient-to-br from-primary-100 to-primary-50 flex items-center justify-center relative">
          {folder.coverImage ? (
            <img src={folder.coverImage} alt={folder.title} className="w-full h-full object-cover" />
          ) : (
            <span className="text-4xl">{folder.icon || "📚"}</span>
          )}
          {isLocked && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <Lock size={20} className="text-white" />
            </div>
          )}
        </div>

        {/* Ma'lumot */}
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-bold text-gray-900 text-base truncate">{folder.title}</h3>
              {folder.description && (
                <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{folder.description}</p>
              )}
            </div>
            <ChevronRight className="w-5 h-5 text-primary-500 shrink-0" />
          </div>

          {/* Onlayn userlar + dars soni */}
          <div className="flex items-center gap-3 mt-2 text-[11px] text-gray-500">
            <span className="flex items-center gap-1">
              📖 {totalTopics} dars{folderItems.length - totalTopics > 0 ? ` · ${folderItems.length - totalTopics} test` : ""}
            </span>
            {onlineCount > 0 && (
              <span className="flex items-center gap-1 text-green-600 font-medium">
                <Users size={12} /> {onlineCount} onlayn
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              </span>
            )}
          </div>

          {/* Progress bar */}
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
    </Link>
  );
}
