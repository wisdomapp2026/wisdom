import { Link, useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { getTopicById, getProblemsByTopic, getUserProgress, setUserProgress, getTopicsByCourse, getMotivationPhrases, getMotivationSettings } from "@shared/repositories";
import type { Topic, Problem, UserProgress } from "@shared/types";
import { ChevronLeft, Star, Play, Lock, CheckCircle } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import AuthModal from "../components/AuthModal";
import VideoModal from "../components/VideoModal";
import LatexText from "../components/LatexText";

const diffColors: Record<string, string> = { easy: "bg-green-100 text-green-700", medium: "bg-yellow-100 text-yellow-700", hard: "bg-red-100 text-red-700" };
const diffLabels: Record<string, string> = { easy: "Easy", medium: "Medium", hard: "Hard" };

export default function TopicDetail() {
  const { courseId, topicId } = useParams<{ courseId: string; topicId: string }>();
  const navigate = useNavigate();
  const { user, isLoggedIn } = useAuth();
  const [topic, setTopic] = useState<Topic | null>(null);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [motivationPhrase, setMotivationPhrase] = useState("");

  useEffect(() => {
    if (!courseId || !topicId) return;
    Promise.all([getTopicById(courseId, topicId), getProblemsByTopic(courseId, topicId)])
      .then(([t, p]) => { setTopic(t); setProblems(p); })
      .catch(console.error)
      .finally(() => setLoading(false));

    // Dars ichidagi motivatsion frazani yuklash
    loadMotivation();
  }, [courseId, topicId]);

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

  // O'quvchi mavzuni ochganida progress saqlash
  useEffect(() => {
    if (!courseId || !topicId || !user) return;
    saveProgress();
  }, [courseId, topicId, user]);

  async function saveProgress() {
    if (!courseId || !topicId || !user) return;
    const userId = user.uid;
    const progressId = `${userId}_${courseId}`;

    try {
      const existing = await getUserProgress(userId, courseId);
      if (existing) {
        const completedTopics = existing.completedTopics.includes(topicId)
          ? existing.completedTopics
          : [...existing.completedTopics, topicId];

        const allTopics = await getTopicsByCourse(courseId);
        const progressPercent = allTopics.length > 0
          ? Math.round((completedTopics.length / allTopics.length) * 100)
          : 0;

        await setUserProgress({
          ...existing,
          completedTopics,
          currentTopicId: topicId,
          progressPercent,
          lastAccessedAt: Date.now(),
        });
      } else {
        const allTopics = await getTopicsByCourse(courseId);
        const progressPercent = allTopics.length > 0 ? Math.round((1 / allTopics.length) * 100) : 0;

        await setUserProgress({
          id: progressId,
          userId,
          courseId,
          completedTopics: [topicId],
          completedProblems: [],
          currentTopicId: topicId,
          progressPercent,
          totalXP: 10,
          streak: 1,
          weeklyMinutes: [0, 0, 0, 0, 0, 0, 0],
          lastAccessedAt: Date.now(),
        });
      }
    } catch (err) {
      console.error("Progress saqlashda xatolik:", err);
    }
  }

  async function handleProblemCompleted(problemId: string) {
    if (!courseId || !topicId || !user) return;
    const userId = user.uid;
    const progressId = `${userId}_${courseId}`;

    try {
      const existing = await getUserProgress(userId, courseId);
      if (existing) {
        const completedProblems = existing.completedProblems.includes(problemId)
          ? existing.completedProblems
          : [...existing.completedProblems, problemId];

        // Mavzudagi barcha misollar tugatilganmi tekshirish
        const topicProblems = problems.map((p) => p.id);
        const allTopicProblemsDone = topicProblems.every((pid) => completedProblems.includes(pid));

        const completedTopics = allTopicProblemsDone && !existing.completedTopics.includes(topicId)
          ? [...existing.completedTopics, topicId]
          : existing.completedTopics;

        const allTopics = await getTopicsByCourse(courseId);
        const totalProblems = problems.length; // shu mavzuning misollari
        const progressPercent = allTopics.length > 0
          ? Math.round((completedTopics.length / allTopics.length) * 100)
          : 0;

        await setUserProgress({
          ...existing,
          completedTopics,
          completedProblems,
          progressPercent,
          totalXP: (existing.totalXP || 0) + 5,
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
          totalXP: 5,
          streak: 1,
          weeklyMinutes: [0, 0, 0, 0, 0, 0, 0],
          lastAccessedAt: Date.now(),
        });
      }
    } catch (err) {
      console.error("Misol progress saqlashda xatolik:", err);
    }
  }

  if (loading) {
    return <div className="page-content flex items-center justify-center"><div className="w-8 h-8 border-3 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  const freeProblems = problems.filter((p) => !p.isPremium).length;
  const mastery = problems.length > 0 ? Math.round((freeProblems / problems.length) * 100) : 0;

  function handlePremiumClick() {
    if (!isLoggedIn) {
      setShowAuthModal(true);
    } else {
      navigate("/premium-gate");
    }
  }

  return (
    <div className="page-content bg-gray-50">
      {/* Header */}
      <header className="bg-white px-5 pt-4 pb-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to={`/course/${courseId}`} className="text-gray-500"><ChevronLeft size={22} /></Link>
          <h1 className="text-lg font-bold text-gray-900 truncate">{topic?.title || "Mavzu"}</h1>
        </div>
        <button className="text-yellow-400"><Star size={22} /></button>
      </header>

      {/* Topic Mastery */}
      <div className="mx-5 mt-4 bg-white rounded-xl p-4 border border-gray-100">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-gray-900 text-sm">Mavzu darajasi</p>
          <p className="text-2xl font-bold text-primary-500">{mastery}%</p>
        </div>
        <p className="text-xs text-gray-500 mt-1">{freeProblems} / {problems.length} ta misol ochiq</p>
        <div className="h-2 bg-gray-100 rounded-full mt-2">
          <div className="h-full bg-primary-500 rounded-full transition-all" style={{ width: `${mastery}%` }} />
        </div>
        <div className="flex items-center mt-2 gap-2">
          <div className="flex -space-x-1.5">
            <div className="w-5 h-5 bg-gray-300 rounded-full border-2 border-white" />
            <div className="w-5 h-5 bg-gray-400 rounded-full border-2 border-white" />
          </div>
          <p className="text-[11px] text-gray-500">Siz va 12 nafar boshqalar hozir shu mavzuni o'rganmoqda</p>
        </div>
      </div>

      {/* Misollar */}
      <div className="px-5 mt-6 flex justify-between items-center mb-4">
        <h3 className="font-bold text-gray-900">Misollar</h3>
        <button className="text-sm text-primary-500 font-medium">Barchasi →</button>
      </div>

      <div className="px-5 space-y-4">
        {problems.map((p, i) => {
          const isPremium = p.isPremium === true;

          return (
            <StudentProblemCard
              key={p.id}
              problem={p}
              index={i}
              isPremium={isPremium}
              onPremiumClick={handlePremiumClick}
              onPlayVideo={(url) => { setVideoUrl(url); setShowVideoModal(true); }}
              onSolutionViewed={handleProblemCompleted}
            />
          );
        })}
      </div>

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


// ===== StudentProblemCard — flip effekti bilan =====
function StudentProblemCard({ problem, index, isPremium, onPremiumClick, onPlayVideo, onSolutionViewed }: {
  problem: Problem; index: number; isPremium: boolean;
  onPremiumClick: () => void; onPlayVideo: (url: string) => void; onSolutionViewed: (problemId: string) => void;
}) {
  const [flipped, setFlipped] = useState(false);
  const diffColors: Record<string, string> = { easy: "bg-green-100 text-green-700", medium: "bg-yellow-100 text-yellow-700", hard: "bg-red-100 text-red-700" };
  const diffLabels: Record<string, string> = { easy: "Oson", medium: "O'rta", hard: "Qiyin" };

  return (
    <div
      className={`bg-white rounded-xl border transition-all overflow-hidden ${isPremium ? "border-gray-100" : flipped ? "border-blue-300 ring-1 ring-blue-200" : "border-gray-100"}`}
      onClick={isPremium ? onPremiumClick : undefined}
      style={isPremium ? { cursor: "pointer" } : undefined}
    >
      {!flipped ? (
        /* FRONT — Misol */
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
                  onClick={(e) => { e.stopPropagation(); setFlipped(true); onSolutionViewed(problem.id); }}
                  className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 text-sm font-medium rounded-lg active:bg-blue-100"
                >
                  📖 Yechimni ko'rish
                </button>
              )}
              {problem.videoUrl && (
                <button
                  onClick={(e) => { e.stopPropagation(); onPlayVideo(problem.videoUrl!); }}
                  className="flex items-center gap-2 px-3 py-2 bg-purple-50 text-purple-600 text-sm font-medium rounded-lg active:bg-purple-100"
                >
                  <Play size={14} /> Video yechim
                </button>
              )}
            </div>
          )}

          {isPremium && (
            <div className="mt-3 flex items-center gap-2 text-sm text-gray-400">
              <Lock size={14} />
              <span className="italic">Premium foydalanuvchilar uchun</span>
            </div>
          )}
        </div>
      ) : (
        /* BACK — Yechim */
        <div className="p-5 bg-blue-50/50">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-bold text-blue-700">📖 Yechim</span>
            <button onClick={() => setFlipped(false)} className="text-xs text-gray-500 px-2 py-1 bg-white rounded border border-gray-200 active:bg-gray-50">← Orqaga</button>
          </div>
          <div className="bg-white rounded-lg p-4 border border-blue-200">
            {problem.solution?.map((step) => (
              <p key={step.stepNumber} className="text-sm text-gray-800 mb-1.5">
                <span className="font-bold text-blue-600">{step.stepNumber}.</span> <LatexText text={step.text} />
              </p>
            ))}
          </div>
          {problem.videoUrl && (
            <button
              onClick={() => onPlayVideo(problem.videoUrl!)}
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
