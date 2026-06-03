import { Link, useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { getTopicById, getProblemsByTopic } from "@shared/repositories";
import type { Topic, Problem } from "@shared/types";
import { ChevronLeft, Star, Play, Lock, CheckCircle } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import AuthModal from "../components/AuthModal";

const diffColors: Record<string, string> = { easy: "bg-green-100 text-green-700", medium: "bg-yellow-100 text-yellow-700", hard: "bg-red-100 text-red-700" };
const diffLabels: Record<string, string> = { easy: "Easy", medium: "Medium", hard: "Hard" };

export default function TopicDetail() {
  const { courseId, topicId } = useParams<{ courseId: string; topicId: string }>();
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();
  const [topic, setTopic] = useState<Topic | null>(null);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    if (!courseId || !topicId) return;
    Promise.all([getTopicById(courseId, topicId), getProblemsByTopic(courseId, topicId)])
      .then(([t, p]) => { setTopic(t); setProblems(p); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [courseId, topicId]);

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
          <p className="font-semibold text-gray-900 text-sm">Topic Mastery</p>
          <p className="text-2xl font-bold text-primary-500">{mastery}%</p>
        </div>
        <p className="text-xs text-gray-500 mt-1">{freeProblems} of {problems.length} lessons completed today</p>
        <div className="h-2 bg-gray-100 rounded-full mt-2">
          <div className="h-full bg-primary-500 rounded-full transition-all" style={{ width: `${mastery}%` }} />
        </div>
        <div className="flex items-center mt-2 gap-2">
          <div className="flex -space-x-1.5">
            <div className="w-5 h-5 bg-gray-300 rounded-full border-2 border-white" />
            <div className="w-5 h-5 bg-gray-400 rounded-full border-2 border-white" />
          </div>
          <p className="text-[11px] text-gray-500">You and 12 others are studying this now</p>
        </div>
      </div>

      {/* Misollar */}
      <div className="px-5 mt-6 flex justify-between items-center mb-4">
        <h3 className="font-bold text-gray-900">Misollar</h3>
        <button className="text-sm text-primary-500 font-medium">View All →</button>
      </div>

      <div className="px-5 space-y-4">
        {problems.map((p, i) => {
          const isPremium = p.isPremium === true;
          const isDone = !isPremium && i < 2; // demo: birinchi 2 ta done
          const isActive = !isPremium && !isDone;

          return (
            <div
              key={p.id}
              className={`bg-white rounded-xl p-5 border transition-all ${
                isActive ? "border-primary-300 shadow-sm shadow-primary-100" :
                isPremium ? "border-gray-100" : "border-gray-100"
              }`}
              onClick={isPremium ? handlePremiumClick : undefined}
              style={isPremium ? { cursor: "pointer" } : undefined}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-gray-500 font-semibold">{i + 1} · MISOL</span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${diffColors[p.difficulty]}`}>{diffLabels[p.difficulty]}</span>
                </div>
                {isDone && <CheckCircle size={20} className="text-green-500" fill="#22c55e" stroke="white" />}
                {isActive && !isPremium && <div className="flex items-center gap-1"><span className="text-[10px] text-primary-500 font-medium">ACTIVE</span><div className="w-2 h-2 bg-green-500 rounded-full" /></div>}
                {isPremium && <Lock size={16} className="text-gray-400" />}
              </div>

              {/* Content — DOIM ko'rinadi (premium bo'lsa ham) */}
              <p className="text-sm leading-relaxed text-gray-900">{p.content}</p>

              {/* YECHIM va VIDEO — faqat free misollar uchun ko'rsatiladi */}
              {!isPremium && (
                <>
                  {/* Solution (done items) */}
                  {isDone && p.solution && p.solution.length > 0 && (
                    <button className="mt-3 flex items-center gap-2 text-sm text-gray-600 font-medium">
                      <span>📖</span> Review Solution
                    </button>
                  )}

                  {/* Video button (active) */}
                  {isActive && p.videoUrl && (
                    <a href={p.videoUrl} target="_blank" rel="noreferrer" className="mt-4 w-full bg-primary-500 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2">
                      <Play size={16} fill="white" /> Watch Video Solution
                    </a>
                  )}
                </>
              )}

              {/* Premium — yechim/video o'rniga qulf xabari */}
              {isPremium && (
                <div className="mt-3 flex items-center gap-2 text-sm text-gray-400">
                  <Lock size={14} />
                  <span className="italic">Yechim va video — premium foydalanuvchilar uchun</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Refresher tip */}
      <div className="mx-5 mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
        <span className="text-primary-500">📖</span>
        <div>
          <p className="font-semibold text-gray-900 text-sm">Need a refresher?</p>
          <p className="text-xs text-gray-600 mt-0.5">Re-watch the introduction video for a quick summary of formulas.</p>
        </div>
      </div>

      {/* Auth Modal */}
      <AuthModal open={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </div>
  );
}
