import { Link, useParams, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { getCourseById, getTopicsByCourse, getTestsByCourse, getUserProgress, setUserProgress, getProblemsByTopic, getAllProgressByCourse, getAdviceByCourse, getMotivationPhrases, getMotivationSettings, getActiveCourseLinks, getFoldersByCourse, getFolderOnlineCount, markCoursePresence, clearCoursePresence, getCourseOnlineCount, getUserById } from "@shared/repositories";
import type { Course, Topic, Test, UserProgress, Advice, MotivationalPhrase, MotivationSettings, SocialLink, Folder } from "@shared/types";
import { CheckCircle, Clock, Lock, FileText, Play, ChevronDown, ChevronUp, ChevronRight, MessageSquare, ExternalLink, Users, UserPlus, Download, ArrowLeft, BookOpen, Star, Trophy } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useCourseAccess } from "../hooks/useCourseAccess";
import { CourseDetailLoader } from "../components/PageLoader";
import { getLocalCourseProgress, enrollLocalCourse, setLocalCourseProgress } from "../hooks/useLocalProgress";
import { cachedFetch } from "../hooks/useCache";
import LatexText from "../components/LatexText";
import VideoModal from "../components/VideoModal";

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
  // Prefikssiz nom
  return title;
}

export default function CourseDetail() {
  const { courseId } = useParams<{ courseId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { hasAccess: hasSubscription, loading: subLoading } = useCourseAccess(courseId);
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
  const [studentAvatars, setStudentAvatars] = useState<Array<{ avatar?: string; name?: string }>>([]);
  const [motivationPhrase, setMotivationPhrase] = useState<string>("");
  const [courseSocialLinks, setCourseSocialLinks] = useState<SocialLink[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [folderOnlineCounts, setFolderOnlineCounts] = useState<Record<string, number>>({});
  const [courseOnlineCount, setCourseOnlineCount] = useState(0);
  const presenceRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [showVideoModal, setShowVideoModal] = useState(false);

  useEffect(() => {
    if (!courseId) return;
    loadData();
  }, [courseId, user, location.key]);

  // Kurs ochilganda — onlayn presence belgilash (heartbeat)
  useEffect(() => {
    if (!courseId || !user?.uid) return;
    let cancelled = false;

    async function beat() {
      try {
        await markCoursePresence(courseId!, user!.uid);
        const cnt = await getCourseOnlineCount(courseId!);
        if (!cancelled) setCourseOnlineCount(cnt);
      } catch {
        // jim
      }
    }
    beat();
    presenceRef.current = setInterval(beat, 30000);

    return () => {
      cancelled = true;
      if (presenceRef.current) clearInterval(presenceRef.current);
      clearCoursePresence(courseId!, user!.uid).catch(() => {});
    };
  }, [courseId, user?.uid]);

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

        // Birinchi 3 o'quvchining avatarini yuklash
        const topUsers = allProgress.slice(0, 3);
        const avatars = await Promise.all(
          topUsers.map(async (p) => {
            try {
              const u = await getUserById(p.userId);
              return { avatar: u?.avatar, name: u?.name };
            } catch { return { avatar: undefined, name: undefined }; }
          })
        );
        setStudentAvatars(avatars);

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

        // Birinchi 3 o'quvchining avatarini yuklash
        const topUsers = allProgress.slice(0, 3);
        const avatars = await Promise.all(
          topUsers.map(async (p) => {
            try {
              const u = await getUserById(p.userId);
              return { avatar: u?.avatar, name: u?.name };
            } catch { return { avatar: undefined, name: undefined }; }
          })
        );
        setStudentAvatars(avatars);
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

  // Hero dagi asosiy progress — MAVZULAR bo'yicha (chunki "N / M mavzu tugallangan" deb ko'rsatiladi)
  const progressPercent = totalTopicsCount > 0
    ? Math.round((realCompletedCount / totalTopicsCount) * 100)
    : 0;

  // Bitta papkadagi progress (shu papkadagi modullar tugatilishiga qarab)
  function getFolderProgress(folderId: string): number {
    const folderTopics = topics.filter((t) => t.folderId === folderId);
    if (folderTopics.length === 0) return 0;
    const doneCount = folderTopics.filter((t) => isTopicCompleted(t.id)).length;
    return Math.round((doneCount / folderTopics.length) * 100);
  }

  // Onlayn son — real presence, agar 0 bo'lsa admin kiritgan qiymat
  const onlineNow = courseOnlineCount > 0 ? courseOnlineCount : (course?.onlineNow || 0);

  // "Davom etish" tugmasi manzili — keyingi tugatilmagan mavzu (yoki birinchi mavzu)
  const nextTopic =
    topics.find((t) => !isTopicCompleted(t.id) && !(t.isPremium && !hasSubscription)) ||
    topics[0] ||
    null;
  const continueTarget = nextTopic
    ? (nextTopic.isPremium && !hasSubscription
        ? `/premium-gate?course=${courseId}`
        : (nextTopic.folderId
            ? `/course/${courseId}/folder/${nextTopic.folderId}`
            : `/course/${courseId}/topic/${nextTopic.id}`))
    : null;

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
          to={isLocked ? `/premium-gate?course=${courseId}` : `/course/${courseId}/topic/${topic.id}`}
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
              <p className="font-semibold text-gray-900 text-sm truncate">{cleanTopicTitle(topic.title)}</p>
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

  // Kursga qo'shilish funksiyasi
  async function handleEnroll() {
    if (!courseId) return;
    // Login talab qilish
    if (!user) {
      navigate("/login");
      return;
    }
    setEnrolling(true);
    try {
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
      setIsEnrolled(true);
    } catch (err) {
      console.error("Kursga qo'shilishda xatolik:", err);
    } finally {
      setEnrolling(false);
    }
  }

  return (
    <div className="page-content">
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
            <span>📚 {hasFolders ? `${folders.length} modul` : `${topics.length} mavzu`}</span>
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
          {!user && <p className="text-[10px] text-gray-400 mt-2">Kursga qo'shilish uchun tizimga kiring</p>}
        </div>
      ) : (
      <>
        {/* ===== Hero — to'q binafsha gradient fon ===== */}
        <div className="relative -mt-px bg-gradient-to-b from-[#1e1b4b] via-[#2e2a6e] to-[#3730a3] px-5 pt-4 pb-24 rounded-b-[2rem]">
          {/* Yuqori nav — orqaga */}
          <div className="flex items-center mb-5">
            <Link to="/courses" className="text-white/90 hover:text-white" aria-label="Orqaga">
              <ArrowLeft size={22} />
            </Link>
          </div>

          {/* Kategoriya + sarlavha + muqova */}
          <div className="flex gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                {course?.category && (
                  <span className="inline-block bg-indigo-500 text-white text-[11px] font-semibold px-3 py-1 rounded-full">
                    {course.category}
                  </span>
                )}
                {course?.isPremium && (
                  <span className="inline-flex items-center gap-1 bg-yellow-500 text-white text-[11px] font-semibold px-3 py-1 rounded-full">
                    👑 Premium
                  </span>
                )}
              </div>
              <h1 className="text-white text-2xl font-bold leading-tight">{course?.title}</h1>

              {/* O'quvchilar avatarlari + sonlar */}
              <div className="flex items-center gap-3 mt-3 flex-wrap">
                <div className="flex items-center gap-2">
                  {studentAvatars.length > 0 && (
                    <div className="flex -space-x-2">
                      {studentAvatars.map((s, i) => (
                        <div
                          key={i}
                          className="w-7 h-7 rounded-full border-2 border-[#2e2a6e] overflow-hidden bg-gradient-to-br from-indigo-300 to-purple-400 flex items-center justify-center"
                        >
                          {s.avatar ? (
                            <img src={s.avatar} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-[10px] font-bold text-white">
                              {(s.name || "U").charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  <span className="text-white/90 text-xs font-medium">
                    {(totalStudentsInCourse || course?.totalStudents || 0).toLocaleString()} o'quvchi
                  </span>
                </div>
                <span className="flex items-center gap-1.5 text-white/90 text-xs font-medium">
                  <span className="w-2 h-2 bg-green-400 rounded-full" />
                  {onlineNow} ta onlayn
                </span>
              </div>
            </div>

            {/* Kurs sahifasi rasmi — hero uchun alohida yuklangan rasm, bo'lmasa muqova */}
            {(course?.heroImage || course?.coverImage) && (
              <div className="w-24 h-32 shrink-0 rounded-lg overflow-hidden shadow-2xl">
                <img
                  src={course.heroImage || course.coverImage}
                  alt={course.title}
                  className="w-full h-full"
                  style={
                    course.heroImage
                      ? { objectFit: course.heroImageFit || "cover", objectPosition: course.heroImagePosition || "50% 50%" }
                      : { objectFit: course.coverFit || "cover", objectPosition: course.coverPosition || "50% 50%" }
                  }
                />
              </div>
            )}
          </div>

          {/* Progress paneli — dumaloq indikator + segmentli bar + Davom etish */}
          <div className="mt-5 bg-white/10 backdrop-blur rounded-2xl p-4 flex items-center gap-4">
            {/* Dumaloq progress */}
            <div className="relative w-20 h-20 shrink-0">
              <svg className="w-20 h-20 -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="4" />
                <circle
                  cx="18" cy="18" r="15.5" fill="none" stroke="#8b7ff5" strokeWidth="4"
                  strokeDasharray={`${(progressPercent / 100) * 97.4} 97.4`}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-white text-lg font-bold">
                {progressPercent}%
              </span>
            </div>

            {/* Mavzu hisobi + segmentlar + tugma */}
            <div className="flex-1 min-w-0">
              <p className="text-white/90 text-sm">
                <span className="font-bold">{realCompletedCount}</span>
                <span className="text-white/60"> / {totalTopicsCount} mavzu tugallangan</span>
              </p>

              {/* Segmentli progress bar */}
              <div className="flex gap-1 mt-2">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 flex-1 rounded-full ${i < Math.round(progressPercent / 10) ? "bg-indigo-400" : "bg-white/15"}`}
                  />
                ))}
              </div>

              {/* Davom etish tugmasi */}
              {continueTarget && (
                <Link
                  to={continueTarget}
                  className="mt-3 w-full flex items-center justify-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors active:scale-[0.98]"
                >
                  <Play className="w-4 h-4 fill-current" />
                  Davom etish
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* ===== Statistika kartasi — hero ustiga chiqib turadi ===== */}
        <div className="mx-4 -mt-16 relative z-10 bg-white rounded-2xl shadow-lg py-4">
          <div className="flex items-stretch">
            <StatCell
              icon={<Star className="w-6 h-6 text-yellow-400" fill="currentColor" />}
              value={`${userProgress?.totalXP || 0} XP`}
              label="Umumiy ball"
            />
            <div className="w-px bg-gray-100 my-1" />
            <StatCell
              icon={<Trophy className="w-6 h-6 text-yellow-400" fill="currentColor" />}
              value={userRank !== null ? `${userRank}-o'rin` : "—"}
              label="Reyting"
            />
            <div className="w-px bg-gray-100 my-1" />
            <StatCell
              icon={<Users className="w-6 h-6 text-blue-500" fill="currentColor" />}
              value={(totalStudentsInCourse || course?.totalStudents || 0).toLocaleString()}
              label="O'quvchi"
            />
            <div className="w-px bg-gray-100 my-1" />
            <StatCell
              icon={<span className="w-5 h-5 bg-green-500 rounded-full inline-block shadow-inner" />}
              value={`${onlineNow}`}
              label="Online"
            />
          </div>
        </div>
      </>
      )}

      {/* Kursni tanishtirish */}
      {course?.introduction && course.introduction.text && (
        <CourseIntroCard introduction={course.introduction} onPlayVideo={(url) => { setVideoUrl(url); setShowVideoModal(true); }} />
      )}

      {/* Motivatsion fraza */}
      {motivationPhrase && (
        <div className="mx-5 mt-5 bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
          <span className="text-2xl mt-0.5">💡</span>
          <p className="text-sm text-gray-700 leading-relaxed italic">"{motivationPhrase}"</p>
        </div>
      )}

      {/* Modullar */}
      <div className="px-4 mt-5 flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-indigo-500" />
          <h3 className="text-base font-bold text-gray-900">Kurs Modullari</h3>
        </div>
      </div>

      <div className="px-4 space-y-2.5">
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

          // Papkali va papkasiz elementlar (testlar faqat mavzu ichida ko'rinadi — bu yerda ko'rsatilmaydi)
          const looseItems = combined.filter((it) => !getFolderId(it) && it.type !== "test");

          return (
            <>
              {/* Papkalar */}
              {folders.map((folder, folderIdx) => {
                const folderItems = combined.filter((it) => getFolderId(it) === folder.id);
                // Sequential mode: oldingi modul tugatilmaguncha keyingisi qulflangan
                let sequenceLocked = false;
                if (course?.unlockMode === "sequential" && folderIdx > 0) {
                  const prevFolder = folders[folderIdx - 1];
                  if (!isFolderCompleted(prevFolder.id)) {
                    sequenceLocked = true;
                  }
                }
                return (
                  <FolderBlock
                    key={folder.id}
                    folder={folder}
                    folderItems={folderItems}
                    hasSubscription={hasSubscription}
                    sequenceLocked={sequenceLocked}
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

      {/* Video Modal */}
      <VideoModal open={showVideoModal} videoUrl={videoUrl} onClose={() => setShowVideoModal(false)} />
    </div>
  );
}


// ===== Statistika ustuni (hero ostidagi karta uchun) =====
function StatCell({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="flex-1 min-w-0 flex flex-col items-center justify-start gap-1.5 px-1">
      <div className="flex items-center justify-center h-6">{icon}</div>
      <p className="text-sm font-bold text-gray-900 text-center leading-tight truncate w-full">{value}</p>
      <p className="text-[10px] text-gray-400 text-center leading-tight">{label}</p>
    </div>
  );
}


// ===== Kursni tanishtirish kartasi =====
function CourseIntroCard({ introduction, onPlayVideo }: { introduction: NonNullable<Course["introduction"]>; onPlayVideo: (url: string) => void }) {
  // Videodan keyingi matn (izoh) — akkordion, yopiq holatda boshlanadi
  const [textExpanded, setTextExpanded] = useState(false);

  // YouTube thumbnail
  function getYouTubeThumbnail(url: string): string {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?]+)/);
    return match ? `https://img.youtube.com/vi/${match[1]}/mqdefault.jpg` : "";
  }

  const thumbnail = introduction.thumbnailUrl || (introduction.videoType === "youtube" && introduction.videoUrl ? getYouTubeThumbnail(introduction.videoUrl) : "");

  return (
    <div className="mx-4 mt-4 bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
      {/* Sarlavha — ikonka + matn */}
      <div className="flex gap-3 mb-3">
        <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
          <BookOpen className="w-6 h-6 text-indigo-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-900 text-base">Kursni tanishtirish</p>
          <p className="text-sm text-gray-500 leading-relaxed mt-0.5">{introduction.text}</p>
        </div>
      </div>

      {introduction.imageUrl && (
        <div className="mb-3 rounded-lg overflow-hidden">
          <img src={introduction.imageUrl} alt="Kurs tanishtirish" className="w-full max-h-48 object-cover rounded-lg" />
        </div>
      )}

      {/* Video — bosilganda to'liq ekranda ochiladi */}
      {introduction.videoUrl && (
        <button
          onClick={() => onPlayVideo(introduction.videoUrl!)}
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
      )}

      {/* Batafsil izoh — ko'k link, bosilganda ochiladi */}
      {introduction.afterVideoText && (
        <div className="mt-2">
          <button
            onClick={() => setTextExpanded(!textExpanded)}
            className="flex items-center gap-1 text-indigo-600 text-sm font-semibold active:opacity-70"
          >
            Batafsil izoh
            {textExpanded ? (
              <ChevronUp className="w-4 h-4 shrink-0" />
            ) : (
              <ChevronRight className="w-4 h-4 shrink-0" />
            )}
          </button>
          {textExpanded && (
            <div className="mt-2 pb-1 overflow-hidden">
              {/<[a-z][\s\S]*>/i.test(introduction.afterVideoText) ? (
                <div className="text-sm text-gray-700 leading-relaxed break-words [overflow-wrap:anywhere] rich-text-content">
                  <LatexText text={introduction.afterVideoText} />
                </div>
              ) : (
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                  <LatexText text={introduction.afterVideoText} />
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Biriktirilgan fayl — Word ikonka bilan */}
      {introduction.attachedFileUrl && (
        <a
          href={introduction.attachedFileUrl}
          target="_blank"
          rel="noopener noreferrer"
          download={introduction.attachedFileName}
          className="mt-3 flex items-center gap-3 px-3 py-3 bg-gray-50 border border-gray-100 rounded-xl active:bg-gray-100 transition-colors"
        >
          <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center shrink-0">
            <span className="text-white text-base font-bold">W</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{introduction.attachedFileName || "Biriktirilgan fayl"}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">Yuklab olish uchun bosing</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
            <Download className="w-4 h-4 text-indigo-500" />
          </div>
        </a>
      )}
    </div>
  );
}


// ===== Kurs Ijtimoiy Tarmoqlari =====
const PLATFORM_META: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  telegram: { label: "Telegram", color: "#0088cc", icon: <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg> },
  instagram: { label: "Instagram", color: "#E4405F", icon: <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor"><path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 1 0 0-12.324zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405a1.441 1.441 0 1 1-2.88 0 1.441 1.441 0 0 1 2.88 0z"/></svg> },
  youtube: { label: "YouTube", color: "#FF0000", icon: <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg> },
  facebook: { label: "Facebook", color: "#1877F2", icon: <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg> },
  tiktok: { label: "TikTok", color: "#000000", icon: <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg> },
  twitter: { label: "Twitter", color: "#1DA1F2", icon: <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg> },
  linkedin: { label: "LinkedIn", color: "#0A66C2", icon: <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg> },
  website: { label: "Veb-sayt", color: "#6B7280", icon: <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg> },
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
                className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 overflow-hidden"
                style={{ backgroundColor: link.iconUrl ? "transparent" : meta.color + "15", color: meta.color }}
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
  sequenceLocked,
  progress,
  onlineCount,
  courseId,
}: {
  folder: Folder;
  folderItems: FolderItem[];
  hasSubscription: boolean;
  sequenceLocked?: boolean;
  progress: number;
  onlineCount: number;
  courseId: string;
}) {
  const isLocked = (folder.isPremium && !hasSubscription) || !!sequenceLocked;
  const totalTopics = folderItems.filter((it) => it.type === "topic").length;

  const [showLockMsg, setShowLockMsg] = useState(false);

  return (
    <>
    <Link
      to={isLocked ? (sequenceLocked ? "#" : `/premium-gate?course=${courseId}`) : `/course/${courseId}/folder/${folder.id}`}
      onClick={(e) => {
        if (sequenceLocked) {
          e.preventDefault();
          setShowLockMsg(true);
          setTimeout(() => setShowLockMsg(false), 3000);
        }
      }}
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
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <h3 className="font-bold text-gray-900 text-base truncate">{folder.title}</h3>
                {folder.isPremium && (
                  <span className="shrink-0 text-yellow-500 text-xs">👑</span>
                )}
              </div>
              {folder.description && (
                <p className="text-xs text-gray-500 mt-0.5">{folder.description}</p>
              )}
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-gray-400 uppercase tracking-wide">Progress</span>
              <span className="text-[11px] font-bold text-primary-600">{progress}%</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-primary-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
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
        </div>

        {/* Strelka — vertikal o'rtada */}
        <div className="flex items-center shrink-0 self-center">
          <ChevronRight className="w-5 h-5 text-primary-500" />
        </div>
      </div>
    </Link>
    {showLockMsg && (
      <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white text-xs font-medium px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 max-w-[85%]">
        <Lock size={14} className="shrink-0 text-yellow-400" />
        <span>Avvalgi modulni tugatmasdan keyingisiga o'tib bo'lmaydi</span>
      </div>
    )}
    </>
  );
}
