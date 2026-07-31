import { Link, useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef, useCallback } from "react";
import { getTopicById, getProblemsByTopic, getUserProgress, setUserProgress, getTopicsByCourse, getMotivationPhrases, getMotivationSettings, addFavoriteTopic, removeFavoriteTopic, isFavoriteTopic, getTestsByCourse, markTopicPresence, clearTopicPresence, getTopicPresenceUsers, getUserById } from "@shared/repositories";
import type { Topic, Problem, UserProgress, Test } from "@shared/types";
import { ChevronLeft, Star, Play, Lock, CheckCircle, ChevronDown, ChevronUp, FileText, Download } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { getLocalCourseProgress, setLocalCourseProgress } from "../hooks/useLocalProgress";
import { invalidateCache, invalidateCacheByPrefix } from "../hooks/useCache";
import AuthModal from "../components/AuthModal";
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
import LatexText from "../components/LatexText";
import { TopicDetailLoader } from "../components/PageLoader";
import { splitSolutionIntoSteps } from "../utils/splitSolution";
import { checkAndIssueCertificate } from "../hooks/useCertificateCheck";

const diffColors: Record<string, string> = { easy: "bg-green-100 text-green-700", medium: "bg-yellow-100 text-yellow-700", hard: "bg-red-100 text-red-700" };
const diffLabels: Record<string, string> = { easy: "Easy", medium: "Medium", hard: "Hard" };

export default function TopicDetail() {
  const { courseId, topicId } = useParams<{ courseId: string; topicId: string }>();
  const navigate = useNavigate();
  const { user, isLoggedIn } = useAuth();
  const [topic, setTopic] = useState<Topic | null>(null);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [topicTests, setTopicTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [motivationPhrase, setMotivationPhrase] = useState("");
  const [isFavorite, setIsFavorite] = useState(false);
  const [favLoading, setFavLoading] = useState(false);
  const [viewedCount, setViewedCount] = useState(0);
  const viewedRef = useRef(new Set<string>());
  const [topicOnlineUsers, setTopicOnlineUsers] = useState<Array<{ avatar?: string; name?: string }>>([]);
  const presenceRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [visibleProblemsCount, setVisibleProblemsCount] = useState(10);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  /**
   * Orqaga qaytish — mavzu modul (papka) ichida bo'lsa modulga, aks holda kursga.
   * Brauzer tarixida orqa sahifa bo'lsa undan foydalanamiz (back tugmasi bilan bir xil xatti-harakat).
   */
  function handleBack() {
    if (topic?.folderId) {
      navigate(`/course/${courseId}/folder/${topic.folderId}`);
    } else {
      navigate(`/course/${courseId}`);
    }
  }

  // Lazy loading — pastga scroll qilganda ko'proq misollarni ko'rsatish
  useEffect(() => {
    if (!loadMoreRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleProblemsCount((prev) => prev + 10);
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [problems.length]);

  // Yangi mavzu ochilganda misollar sonini reset qilish
  useEffect(() => {
    setVisibleProblemsCount(10);
  }, [topicId]);

  useEffect(() => {
    if (!courseId || !topicId) return;
    Promise.all([getTopicById(courseId, topicId), getProblemsByTopic(courseId, topicId), getTestsByCourse(courseId)])
      .then(([t, p, allTests]) => {
        setTopic(t);
        setProblems(p.filter(x => !x.isHidden));
        // Faqat shu modulga tegishli (afterTopicOrder === topic.order) va published testlarni ko'rsatish
        if (t) {
          setTopicTests(allTests.filter(test => test.status === "published" && test.afterTopicOrder === t.order));
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));

    // Dars ichidagi motivatsion frazani yuklash
    loadMotivation();
  }, [courseId, topicId]);

  // Topic presence — hozir shu mavzuni o'qiyotgan userlar
  useEffect(() => {
    if (!courseId || !topicId || !user?.uid) return;
    let cancelled = false;

    async function beat() {
      try {
        await markTopicPresence(courseId!, topicId!, user!.uid);
        const userIds = await getTopicPresenceUsers(courseId!, topicId!);
        // O'zimni chiqarib tashlash
        const others = userIds.filter((id) => id !== user!.uid);
        if (cancelled) return;
        // Birinchi 3 userning avatarini olish
        const avatars = await Promise.all(
          others.slice(0, 3).map(async (uid) => {
            try {
              const u = await getUserById(uid);
              return { avatar: u?.avatar, name: u?.name };
            } catch { return { avatar: undefined, name: undefined }; }
          })
        );
        if (!cancelled) setTopicOnlineUsers(others.length > 0 ? avatars : []);
      } catch {}
    }
    beat();
    presenceRef.current = setInterval(beat, 30000);

    return () => {
      cancelled = true;
      if (presenceRef.current) clearInterval(presenceRef.current);
      clearTopicPresence(courseId!, topicId!, user!.uid).catch(() => {});
    };
  }, [courseId, topicId, user?.uid]);

  async function loadMotivation() {
    try {
      const [phrases, settings] = await Promise.all([
        getMotivationPhrases("topic"),
        getMotivationSettings("topic"),
      ]);
      const activePhrases = phrases.filter((p) => p.isActive);
      if (activePhrases.length > 0) {
        const hours = settings?.rotateHours || 2;
        const isRandom = settings?.displayOrder === "random";
        if (isRandom) {
          const idx = Math.floor(Math.random() * activePhrases.length);
          setMotivationPhrase(activePhrases[idx].text);
        } else {
          const hoursSinceEpoch = Math.floor(Date.now() / (1000 * 60 * 60));
          const idx = Math.floor(hoursSinceEpoch / hours) % activePhrases.length;
          setMotivationPhrase(activePhrases[idx].text);
        }
      }
    } catch (err) {
      // ixtiyoriy — xatolik bo'lsa o'tkazib yuboramiz
    }
  }

  // O'quvchi modulni ochganida progress saqlash
  useEffect(() => {
    if (!courseId || !topicId) return;
    saveProgress();
  }, [courseId, topicId, user]);

  // Tanlangan modul holatini tekshirish
  useEffect(() => {
    if (!user || !topicId) { setIsFavorite(false); return; }
    isFavoriteTopic(user.uid, topicId).then(setIsFavorite).catch(() => {});
  }, [user, topicId]);

  async function handleToggleFavorite() {
    if (!user) { setShowAuthModal(true); return; }
    if (!courseId || !topicId || !topic) return;
    setFavLoading(true);
    const favId = `${user.uid}_${topicId}`;
    try {
      if (isFavorite) {
        await removeFavoriteTopic(favId);
        setIsFavorite(false);
      } else {
        await addFavoriteTopic({
          id: favId,
          userId: user.uid,
          courseId,
          topicId,
          topicTitle: topic.title,
          createdAt: Date.now(),
        });
        setIsFavorite(true);
      }
    } catch (err) {
      console.error("Tanlangan modul xatosi:", err);
    } finally {
      setFavLoading(false);
    }
  }

  async function saveProgress() {
    if (!courseId || !topicId) return;

    if (user) {
      const userId = user.uid;
      const progressId = `${userId}_${courseId}`;

      try {
        const existing = await getUserProgress(userId, courseId);
        const allTopics = await getTopicsByCourse(courseId);
        const allTopicIds = allTopics.map((t) => t.id);

        if (existing) {
          // Faqat mavjud modullarni saqlash (o'chirilganlarni tozalash)
          const validCompleted = existing.completedTopics.filter((id) => allTopicIds.includes(id));
          const completedTopics = validCompleted.includes(topicId)
            ? validCompleted
            : [...validCompleted, topicId];

          const progressPercent = allTopics.length > 0
            ? Math.min(100, Math.round((completedTopics.length / allTopics.length) * 100))
            : 0;

          await setUserProgress({
            ...existing,
            completedTopics,
            currentTopicId: topicId,
            progressPercent,
            lastAccessedAt: Date.now(),
          });
        } else {
          const progressPercent = allTopics.length > 0
            ? Math.min(100, Math.round((1 / allTopics.length) * 100))
            : 0;

          await setUserProgress({
            id: progressId,
            userId,
            courseId,
            completedTopics: [topicId],
            completedProblems: [],
            currentTopicId: topicId,
            progressPercent,
            // Modulni ochish o'z-o'zidan XP bermaydi — reyting faqat test natijalariga bog'liq
            totalXP: 0,
            streak: 1,
            weeklyMinutes: [0, 0, 0, 0, 0, 0, 0],
            lastAccessedAt: Date.now(),
          });
        }
      } catch (err) {
        console.error("Progress saqlashda xatolik:", err);
      }

      // Sertifikat tekshirish — 85%+ bo'lsa avtomatik beriladi
      const userName = user.displayName || user.email?.split("@")[0] || "Foydalanuvchi";
      checkAndIssueCertificate(userId, userName, courseId).catch(() => {});
    } else {
      // Guest — localStorage
      const allTopics = await getTopicsByCourse(courseId);
      const allTopicIds = allTopics.map((t) => t.id);
      const existing = getLocalCourseProgress(courseId);

      if (existing) {
        const validCompleted = existing.completedTopics.filter((id) => allTopicIds.includes(id));
        const completedTopics = validCompleted.includes(topicId)
          ? validCompleted
          : [...validCompleted, topicId];

        const progressPercent = allTopics.length > 0
          ? Math.min(100, Math.round((completedTopics.length / allTopics.length) * 100))
          : 0;

        setLocalCourseProgress(courseId, {
          ...existing,
          completedTopics,
          currentTopicId: topicId,
          progressPercent,
          lastAccessedAt: Date.now(),
        });
      } else {
        const progressPercent = allTopics.length > 0
          ? Math.min(100, Math.round((1 / allTopics.length) * 100))
          : 0;

        setLocalCourseProgress(courseId, {
          id: `local_${courseId}`,
          userId: "local",
          courseId,
          completedTopics: [topicId],
          completedProblems: [],
          currentTopicId: topicId,
          progressPercent,
          // Modulni ochish o'z-o'zidan XP bermaydi — reyting faqat test natijalariga bog'liq
          totalXP: 0,
          streak: 1,
          weeklyMinutes: [0, 0, 0, 0, 0, 0, 0],
          lastAccessedAt: Date.now(),
        });
      }
    }

    // Cache ni yangilash
    if (user) {
      invalidateCache(`progress-${user.uid}`);
    }
    invalidateCache(`course-${courseId}`);
  }

  async function handleProblemCompleted(problemId: string) {
    if (!courseId || !topicId) return;

    if (user) {
      // Login qilgan — DB ga yozish
      const userId = user.uid;
      const progressId = `${userId}_${courseId}`;

      try {
        const existing = await getUserProgress(userId, courseId);
        if (existing) {
          const completedProblems = existing.completedProblems.includes(problemId)
            ? existing.completedProblems
            : [...existing.completedProblems, problemId];

          const topicProblems = problems.map((p) => p.id);
          const allTopicProblemsDone = topicProblems.every((pid) => completedProblems.includes(pid));

          const completedTopics = allTopicProblemsDone && !existing.completedTopics.includes(topicId)
            ? [...existing.completedTopics, topicId]
            : existing.completedTopics;

          const allTopics = await getTopicsByCourse(courseId);
          const progressPercent = allTopics.length > 0
            ? Math.round((completedTopics.length / allTopics.length) * 100)
            : 0;

          // Eslatma: bu yerda totalXP OSHIRILMAYDI — yechimni ko'rish shunchaki
          // ko'rsatish harakati, javob to'g'riligini tekshirmaydi.
          // Reyting (XP) faqat testlarni to'g'ri ishlashga bog'liq (TestScreen.tsx).
          await setUserProgress({
            ...existing,
            completedTopics,
            completedProblems,
            progressPercent,
            lastAccessedAt: Date.now(),
          });
        } else {
          await setUserProgress({
            id: progressId,
            userId,
            courseId,
            completedTopics: [],
            completedProblems: [problemId],
            currentTopicId: topicId,
            progressPercent: 0,
            totalXP: 0,
            streak: 1,
            weeklyMinutes: [0, 0, 0, 0, 0, 0, 0],
            lastAccessedAt: Date.now(),
          });
        }
      } catch (err) {
        console.error("Misol progress saqlashda xatolik:", err);
      }
    } else {
      // Guest — localStorage ga yozish
      const existing = getLocalCourseProgress(courseId);
      if (existing) {
        const completedProblems = existing.completedProblems.includes(problemId)
          ? existing.completedProblems
          : [...existing.completedProblems, problemId];

        const topicProblems = problems.map((p) => p.id);
        const allTopicProblemsDone = topicProblems.every((pid) => completedProblems.includes(pid));

        const completedTopics = allTopicProblemsDone && !existing.completedTopics.includes(topicId)
          ? [...existing.completedTopics, topicId]
          : existing.completedTopics;

        const allTopics = await getTopicsByCourse(courseId);
        const progressPercent = allTopics.length > 0
          ? Math.round((completedTopics.length / allTopics.length) * 100)
          : 0;

        setLocalCourseProgress(courseId, {
          ...existing,
          completedTopics,
          completedProblems,
          progressPercent,
          lastAccessedAt: Date.now(),
        });
      } else {
        setLocalCourseProgress(courseId, {
          id: `local_${courseId}`,
          userId: "local",
          courseId,
          completedTopics: [],
          completedProblems: [problemId],
          currentTopicId: topicId,
          progressPercent: 0,
          totalXP: 0,
          streak: 1,
          weeklyMinutes: [0, 0, 0, 0, 0, 0, 0],
          lastAccessedAt: Date.now(),
        });
      }
    }
  }

  // Misol ekranda ko'ringanda "ko'rilgan" deb belgilash (faqat bepul misollar)
  const handleProblemVisible = useCallback((problemId: string) => {
    // Premium misolni o'qilgan deb hisoblamaslik
    const problem = problems.find((p) => p.id === problemId);
    if (problem?.isPremium) return;
    if (!viewedRef.current.has(problemId)) {
      viewedRef.current.add(problemId);
      setViewedCount(viewedRef.current.size);
    }
  }, [problems]);

  if (loading) {
    return <TopicDetailLoader />;
  }

  const freeProblems = problems.filter((p) => !p.isPremium).length;
  // Progress = o'qilgan bepul misollar / JAMI misollar soni (premium ham hisobga olinadi)
  // Premium ochilmaguncha 100% bo'lmaydi
  const mastery = problems.length > 0 ? Math.round((viewedCount / problems.length) * 100) : 0;

  function handlePremiumClick() {
    if (!isLoggedIn) {
      setShowAuthModal(true);
    } else {
      navigate("/subscription");
    }
  }

  return (
    <div className="page-content bg-gray-50">
      {/* Header */}
      <header className="bg-white px-5 pt-4 pb-4 border-b border-gray-100 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <button onClick={handleBack} className="text-gray-500 shrink-0 self-center" aria-label="Orqaga"><ChevronLeft size={22} /></button>
          <h1 className="text-base font-bold text-gray-900 leading-tight line-clamp-2">{topic ? cleanTopicTitle(topic.title) : "Mavzu"}</h1>
        </div>
        <button
          onClick={handleToggleFavorite}
          disabled={favLoading}
          className={`shrink-0 transition-colors ${isFavorite ? "text-yellow-400" : "text-gray-300 hover:text-yellow-400"}`}
          title={isFavorite ? "Tanlanganlardan o'chirish" : "Tanlanganlarga qo'shish"}
        >
          <Star size={22} fill={isFavorite ? "currentColor" : "none"} />
        </button>
      </header>

      {/* Mehmon ogohlantirish */}
      {!isLoggedIn && (
        <div className="mx-5 mt-3 bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-start gap-3">
          <span className="text-xl shrink-0">⚠️</span>
          <div>
            <p className="text-xs font-semibold text-amber-800">Siz mehmon sifatida kirgansiz</p>
            <p className="text-[11px] text-amber-700 mt-0.5 leading-relaxed">Akkauntga kirmasdan darslarni o'rganishingiz mumkin, lekin natijalaringiz saqlanmaydi!</p>
            <Link to="/login" className="inline-block mt-2 text-[11px] font-semibold text-primary-600 bg-primary-50 px-3 py-1.5 rounded-lg">Akkauntga kirish</Link>
          </div>
        </div>
      )}

      {/* Mavzuni tanishtirish — kursni tanishtirish blokiga o'xshash (video doim ochiq, izoh akkordion) */}
      {topic?.introduction && topic.introduction.text && (
        <TopicIntroCard introduction={topic.introduction} onPlayVideo={(url) => { setVideoUrl(url); setShowVideoModal(true); }} />
      )}

      {/* Mavzu darajasi */}
      <div className="mx-5 mt-4 bg-white rounded-xl p-4 border border-gray-100">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-gray-900 text-sm">Mavzu darajasi</p>
          <p className="text-2xl font-bold text-primary-500">{mastery}%</p>
        </div>
        <p className="text-xs text-gray-500 mt-1">{viewedCount} / {problems.length} ta misol o'qilgan</p>
        <div className="h-2 bg-gray-100 rounded-full mt-2">
          <div className="h-full bg-primary-500 rounded-full transition-all" style={{ width: `${mastery}%` }} />
        </div>
        {topicOnlineUsers.length > 0 && (
          <div className="flex items-center mt-2 gap-2">
            <div className="flex -space-x-1.5">
              {topicOnlineUsers.map((u, i) => (
                <div key={i} className="w-5 h-5 rounded-full border-2 border-white overflow-hidden bg-gradient-to-br from-indigo-300 to-purple-400 flex items-center justify-center">
                  {u.avatar ? (
                    <img src={u.avatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[8px] font-bold text-white">{(u.name || "U").charAt(0).toUpperCase()}</span>
                  )}
                </div>
              ))}
            </div>
            <p className="text-[11px] text-gray-500">
              {topicOnlineUsers.length} nafar hozir shu mavzuni o'rganmoqda
            </p>
          </div>
        )}
      </div>

      {/* Misollar */}
      <div className="px-5 mt-6 flex justify-between items-center mb-4">
        <h3 className="font-bold text-gray-900">Misollar</h3>
        <span className="text-sm text-gray-400">{problems.length} ta</span>
      </div>

      <div className="px-5 space-y-4">
        {problems.slice(0, visibleProblemsCount).map((p, i) => {
          const isPremium = p.isPremium === true;

          return (
            <StudentProblemCard
              key={p.id}
              problem={p}
              index={i}
              isPremium={isPremium}
              isLoggedIn={isLoggedIn}
              onRequireAuth={() => setShowAuthModal(true)}
              onPremiumClick={handlePremiumClick}
              onPlayVideo={(url) => { setVideoUrl(url); setShowVideoModal(true); }}
              onSolutionViewed={handleProblemCompleted}
              onVisible={handleProblemVisible}
            />
          );
        })}

        {/* Lazy load sentinel — ko'ringanida yana 10 ta misol qo'shiladi */}
        {visibleProblemsCount < problems.length && (
          <div ref={loadMoreRef} className="flex items-center justify-center py-6">
            <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            <span className="ml-2 text-sm text-gray-400">Yuklanmoqda...</span>
          </div>
        )}
      </div>

      {/* Modul testlari — admin qo'shgan testlar */}
      {topicTests.length > 0 && (
        <div className="px-5 mt-6">
          <h3 className="font-bold text-gray-900 mb-3">Testlar</h3>
          <div className="space-y-3">
            {topicTests.map((test) => {
              const testLocked = test.isPremium && !isLoggedIn;
              return (
                <Link
                  to={testLocked ? "/premium-gate" : `/test/${test.id}`}
                  key={test.id}
                  className={`flex items-center border rounded-xl p-4 gap-3 hover:shadow-sm transition-shadow ${testLocked ? "border-yellow-200 bg-yellow-50/30" : "border-orange-100 bg-orange-50/30"}`}
                >
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${testLocked ? "bg-yellow-100" : "bg-orange-100"}`}>
                    {testLocked ? <Lock size={18} className="text-yellow-500" /> : <FileText size={20} className="text-orange-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{test.title}</p>
                    <p className="text-[10px] text-primary-500 font-medium truncate mt-0.5">
                      {topic ? cleanTopicTitle(topic.title) : ""}
                    </p>
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
            })}
          </div>
        </div>
      )}

      {/* Eslatma */}
      <div className="mx-5 mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
        <span className="text-primary-500">📖</span>
        <div>
          <p className="font-semibold text-gray-900 text-sm">Esdan chiqardingizmi?</p>
          <p className="text-xs text-gray-600 mt-0.5">Formulalarni tez takrorlash uchun kirish videosini qayta ko'ring.</p>
        </div>
      </div>

      {/* Motivatsion fraza */}
      {motivationPhrase && (
        <div className="mx-5 mt-4 bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
          <span className="text-2xl mt-0.5">💡</span>
          <p className="text-sm text-gray-700 leading-relaxed italic">"{motivationPhrase}"</p>
        </div>
      )}

      {/* Auth Modal */}
      <AuthModal open={showAuthModal} onClose={() => setShowAuthModal(false)} />

      {/* Video Modal */}
      <VideoModal open={showVideoModal} videoUrl={videoUrl} onClose={() => setShowVideoModal(false)} />
    </div>
  );
}


// ===== Mavzuni tanishtirish kartasi — CourseDetail dagi CourseIntroCard bilan bir xil uslub =====
function TopicIntroCard({ introduction, onPlayVideo }: { introduction: NonNullable<Topic["introduction"]>; onPlayVideo: (url: string) => void }) {
  // Videodan keyingi matn (izoh) — akkordion, yopiq holatda boshlanadi
  const [textExpanded, setTextExpanded] = useState(false);

  function getYouTubeThumbnail(url: string): string {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?]+)/);
    return match ? `https://img.youtube.com/vi/${match[1]}/mqdefault.jpg` : "";
  }

  const thumbnail = introduction.thumbnailUrl || (introduction.videoType === "youtube" && introduction.videoUrl ? getYouTubeThumbnail(introduction.videoUrl) : "");

  return (
    <div className="mx-5 mt-4 bg-white border border-gray-100 rounded-xl p-4">
      {/* Sarlavha */}
      <div className="flex items-center gap-2 mb-3">
        <Play className="w-4 h-4 text-primary-500" />
        <p className="font-semibold text-gray-900 text-sm">Mavzuni tanishtirish</p>
      </div>

      {/* Qisqa matn */}
      <p className="text-sm text-gray-700 leading-relaxed mb-3">{introduction.text}</p>

      {introduction.imageUrl && (
        <div className="mb-3 rounded-lg overflow-hidden">
          <img src={introduction.imageUrl} alt="Mavzu tanishtirish" className="w-full max-h-48 object-cover rounded-lg" />
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

      {/* Batafsil izoh — HTML rich text yoki oddiy matn */}
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


// ===== StudentProblemCard — flip effekti bilan =====
function StudentProblemCard({ problem, index, isPremium, isLoggedIn, onRequireAuth, onPremiumClick, onPlayVideo, onSolutionViewed, onVisible }: {
  problem: Problem; index: number; isPremium: boolean; isLoggedIn: boolean;
  onRequireAuth: () => void;
  onPremiumClick: () => void; onPlayVideo: (url: string) => void; onSolutionViewed: (problemId: string) => void;
  onVisible?: (problemId: string) => void;
}) {
  const [flipped, setFlipped] = useState(false);
  const [visibleSteps, setVisibleSteps] = useState(1);
  const cardRef = useRef<HTMLDivElement>(null);
  const diffColors: Record<string, string> = { easy: "bg-green-100 text-green-700", medium: "bg-yellow-100 text-yellow-700", hard: "bg-red-100 text-red-700" };
  const diffLabels: Record<string, string> = { easy: "Oson", medium: "O'rta", hard: "Qiyin" };

  // IntersectionObserver — misol ekranda ko'ringanda "o'qilgan" deb belgilash
  useEffect(() => {
    if (!onVisible || !cardRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) onVisible(problem.id); },
      { threshold: 0.5 }
    );
    observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, [problem.id, onVisible]);

  return (
    <div
      ref={cardRef}
      className={`bg-white rounded-xl border transition-all ${isPremium ? "border-yellow-100" : flipped ? "border-blue-300 ring-1 ring-blue-200" : "border-gray-100"}`}
    >
      {/* FRONT — Misol (flipped bo'lganda yashiriladi) */}
      {!flipped && (
        <div className="p-5">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-gray-500 font-semibold">{index + 1} · MISOL</span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${diffColors[problem.difficulty]}`}>{diffLabels[problem.difficulty]}</span>
              </div>
              {isPremium && <Lock size={16} className="text-gray-400" />}
            </div>

            <p className="text-sm leading-relaxed text-gray-900"><LatexText text={problem.content} /></p>
            {problem.image && <img src={problem.image} alt="" className="mt-2 max-h-40 rounded-lg" />}

            {!isPremium && (
              <div className="flex items-center gap-3 mt-4 pt-3 border-t border-gray-100">
                {problem.solution && problem.solution.length > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isLoggedIn) { onRequireAuth(); return; }
                      setFlipped(true); setVisibleSteps(1); onSolutionViewed(problem.id);
                    }}
                    className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 text-sm font-medium rounded-lg active:bg-blue-100"
                  >
                    📖 Yechimni ko'rish
                  </button>
                )}
                {problem.videoUrl && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isLoggedIn) { onRequireAuth(); return; }
                      onPlayVideo(problem.videoUrl!);
                    }}
                    className="flex items-center gap-2 px-3 py-2 bg-purple-50 text-purple-600 text-sm font-medium rounded-lg active:bg-purple-100"
                  >
                    <Play size={14} /> Video yechim
                  </button>
                )}
              </div>
            )}

            {isPremium && (
              <div className="mt-4 pt-3 border-t border-gray-100">
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-center">
                  <Lock size={20} className="text-yellow-600 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-gray-800">Premium misol</p>
                  <p className="text-xs text-gray-500 mt-1">Bu misolni ko'rish uchun obuna talab etiladi</p>
                  <button
                    onClick={(e) => { e.stopPropagation(); onPremiumClick(); }}
                    className="mt-3 w-full bg-yellow-500 text-white font-semibold py-2.5 rounded-lg text-sm active:bg-yellow-600"
                  >
                    🔓 Ochish
                  </button>
                </div>
              </div>
            )}
        </div>
      )}

      {/* BACK — Yechim (faqat flipped bo'lganda ko'rinadi) */}
      {flipped && (
        <div className="p-5 bg-blue-50/50 rounded-xl">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-bold text-blue-700">📖 Yechim</span>
              <button onClick={(e) => { e.stopPropagation(); setFlipped(false); setVisibleSteps(1); }} className="text-xs text-gray-500 px-2 py-1 bg-white rounded border border-gray-200 active:bg-gray-50">← Orqaga</button>
            </div>
            <div className="bg-white rounded-lg p-4 border border-blue-200">
              {(() => {
                // Aqlli qadam ajratish:
                // 1. Agar solution array da 2+ qadam bo'lsa — ularni ishlatish
                // 2. Agar 1 ta qadam bo'lsa — avtomatik bo'laklarga ajratish
                // 3. Solution bo'sh bo'lsa — yechim yo'q
                const rawSteps = problem.solution || [];
                let autoSteps: string[];

                if (rawSteps.length > 1) {
                  // Admin alohida qadamlar yaratgan — ularni ishlatamiz
                  autoSteps = rawSteps.map((s) => s.text);
                } else if (rawSteps.length === 1) {
                  // Bitta uzun matn — avtomatik ajratamiz
                  autoSteps = splitSolutionIntoSteps(rawSteps[0].text);
                } else {
                  autoSteps = [];
                }

                const totalSteps = autoSteps.length;
                const shown = autoSteps.slice(0, visibleSteps);

                return (
                  <>
                    {shown.map((stepText, idx) => (
                      <div key={idx} className="text-sm text-gray-800 mb-3 animate-fadeIn">
                        <div className="whitespace-pre-wrap leading-relaxed"><LatexText text={stepText} /></div>
                      </div>
                    ))}
                    {totalSteps > 0 && (
                      <div className="mt-4 pt-3 border-t border-blue-100 flex items-center justify-between">
                        <span className="text-xs text-gray-500">{Math.min(visibleSteps, totalSteps)} / {totalSteps} qadam</span>
                        {visibleSteps < totalSteps ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => { e.stopPropagation(); setVisibleSteps(totalSteps); }}
                              className="px-3 py-2 bg-blue-50 text-blue-600 text-xs font-medium rounded-lg active:bg-blue-100 flex items-center gap-1"
                            >
                              Yechimni to'liq ochish
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setVisibleSteps((v) => v + 1); }}
                              className="px-4 py-2 bg-blue-500 text-white text-xs font-medium rounded-lg active:bg-blue-600 flex items-center gap-1"
                            >
                              Keyingi qadam →
                            </button>
                          </div>
                        ) : (
                          totalSteps > 1 && (
                            <button
                              onClick={(e) => { e.stopPropagation(); setVisibleSteps(1); }}
                              className="px-3 py-2 bg-gray-100 text-gray-600 text-xs font-medium rounded-lg active:bg-gray-200"
                            >
                              ↺ Boshidan
                            </button>
                          )
                        )}
                      </div>
                    )}
                    {totalSteps === 0 && (
                      <p className="text-sm text-gray-400 italic">Yechim qo'shilmagan</p>
                    )}
                  </>
                );
              })()}
            </div>
            {problem.solutionImage && (
              <img src={problem.solutionImage} alt="" className="mt-3 w-full rounded-lg border border-blue-200" />
            )}
            {problem.videoUrl && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isLoggedIn) { onRequireAuth(); return; }
                  onPlayVideo(problem.videoUrl!);
                }}
                className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 bg-purple-500 text-white text-sm font-medium rounded-lg active:bg-purple-600"
              >
                <Play size={14} fill="white" /> Video yechimni ko'rish
              </button>
            )}
        </div>
      )}
    </div>
  );
}
