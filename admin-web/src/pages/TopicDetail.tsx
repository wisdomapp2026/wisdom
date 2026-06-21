import { useParams, Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { ChevronRight, Plus, Edit, Trash2, Play, Loader2, Lock, Unlock, Eye, EyeOff, Video } from "lucide-react";
import { getTopicById, getProblemsByTopic, updateTopic, deleteTopic, deleteProblem, updateProblem } from "@shared/repositories";
import type { Topic, Problem } from "@shared/types";
import CreateProblemModal from "../components/CreateProblemModal";
import LatexText from "../components/LatexText";

const difficultyColors: Record<string, string> = {
  easy: "bg-green-100 text-green-700",
  medium: "bg-yellow-100 text-yellow-700",
  hard: "bg-red-100 text-red-700",
};

const difficultyLabels: Record<string, string> = {
  easy: "Oson",
  medium: "O'rta",
  hard: "Qiyin",
};

export default function TopicDetail() {
  const { courseId, topicId } = useParams<{ courseId: string; topicId: string }>();
  const navigate = useNavigate();
  const [topic, setTopic] = useState<Topic | null>(null);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showProblemModal, setShowProblemModal] = useState(false);
  const [editingTopic, setEditingTopic] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editingProblem, setEditingProblem] = useState<Problem | null>(null);

  useEffect(() => {
    if (courseId && topicId) loadData(courseId, topicId);
  }, [courseId, topicId]);

  async function loadData(cId: string, tId: string) {
    try {
      const [t, p] = await Promise.all([
        getTopicById(cId, tId),
        getProblemsByTopic(cId, tId),
      ]);
      setTopic(t);
      setProblems(p);
      if (t) { setEditTitle(t.title); setEditDesc(t.description); }
    } catch (err) {
      console.error("Xatolik:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveTopic() {
    if (!courseId || !topicId) return;
    await updateTopic(courseId, topicId, { title: editTitle, description: editDesc });
    setTopic((prev) => prev ? { ...prev, title: editTitle, description: editDesc } : prev);
    setEditingTopic(false);
  }

  async function handleDeleteTopic() {
    if (!courseId || !topicId) return;
    if (!confirm(`"${topic?.title}" mavzusini o'chirishga ishonchingiz komilmi? Ichidagi barcha misollar ham o'chiriladi.`)) return;
    await deleteTopic(courseId, topicId);
    navigate(`/courses/${courseId}`);
  }

  async function handleTogglePremium() {
    if (!courseId || !topicId || !topic) return;
    const newVal = !topic.isPremium;
    await updateTopic(courseId, topicId, { isPremium: newVal });
    setTopic((prev) => prev ? { ...prev, isPremium: newVal } : prev);
  }

  async function handleDeleteProblem(problemId: string) {
    if (!courseId || !topicId) return;
    if (!confirm("Bu misolni o'chirishga ishonchingiz komilmi?")) return;
    await deleteProblem(courseId, topicId, problemId);
    setProblems((prev) => prev.filter((p) => p.id !== problemId));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  if (!topic) {
    return <div className="text-center py-20 text-gray-500">Mavzu topilmadi</div>;
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link to="/courses" className="hover:text-primary-500">Kurslar</Link>
        <ChevronRight className="w-4 h-4" />
        <Link to={`/courses/${courseId}`} className="hover:text-primary-500">Kurs</Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-gray-900 font-medium">{topic.title}</span>
      </div>

      {/* Topic header */}
      <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
        {editingTopic ? (
          /* Edit mode */
          <div className="space-y-3">
            <input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-lg font-bold focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <textarea
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            />
            <div className="flex gap-2">
              <button onClick={handleSaveTopic} className="btn-primary text-sm">Saqlash</button>
              <button onClick={() => setEditingTopic(false)} className="btn-outline text-sm">Bekor</button>
            </div>
          </div>
        ) : (
          /* View mode */
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{topic.title}</h1>
              <p className="text-gray-500 mt-1">{topic.description}</p>
              <div className="flex items-center gap-3 mt-3 text-sm text-gray-500">
                <span>📝 {problems.length} ta misol</span>
                <span>🎬 {problems.filter((p) => p.videoUrl).length} ta video</span>
                <span className={topic.isPremium ? "text-yellow-600 font-medium" : "text-green-600 font-medium"}>
                  {topic.isPremium ? "Premium" : "Bepul"}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Premium/Free toggle */}
              <button
                onClick={handleTogglePremium}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border ${
                  topic.isPremium
                    ? "border-green-200 text-green-700 hover:bg-green-50"
                    : "border-yellow-200 text-yellow-700 hover:bg-yellow-50"
                }`}
              >
                {topic.isPremium ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                {topic.isPremium ? "Free qilish" : "Premium qilish"}
              </button>
              <button onClick={() => setEditingTopic(true)} className="btn-outline text-sm flex items-center gap-2">
                <Edit className="w-4 h-4" />
                Tahrirlash
              </button>
              <button onClick={handleDeleteTopic} className="btn-outline text-sm text-danger border-red-200 hover:bg-red-50 flex items-center gap-2">
                <Trash2 className="w-4 h-4" />
                O'chirish
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add problem */}
      <button onClick={() => setShowProblemModal(true)} className="btn-primary flex items-center gap-2 text-sm">
        <Plus className="w-4 h-4" />
        Yangi misol qo'shish
      </button>

      {/* Problems list */}
      <div className="space-y-4">
        {problems.map((problem, index) => (
          <ProblemCard
            key={problem.id}
            problem={problem}
            index={index}
            courseId={courseId!}
            topicId={topicId!}
            onStartEdit={(p) => setEditingProblem(p)}
            onDelete={handleDeleteProblem}
            onUpdate={() => loadData(courseId!, topicId!)}
          />
        ))}

        {problems.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
            <p className="text-4xl mb-3">📝</p>
            <p className="text-gray-500">Bu mavzuda hali misollar yo'q</p>
            <button onClick={() => setShowProblemModal(true)} className="btn-primary mt-4 text-sm">
              <Plus className="w-4 h-4 inline mr-2" />
              Birinchi misolni qo'shing
            </button>
          </div>
        )}
      </div>

      {/* Create problem modal */}
      <CreateProblemModal
        open={showProblemModal}
        courseId={courseId!}
        topicId={topicId!}
        existingCount={problems.length}
        onClose={() => setShowProblemModal(false)}
        onCreated={() => loadData(courseId!, topicId!)}
      />

      {/* Edit problem modal */}
      <CreateProblemModal
        open={!!editingProblem}
        courseId={courseId!}
        topicId={topicId!}
        existingCount={problems.length}
        editData={editingProblem}
        onClose={() => setEditingProblem(null)}
        onCreated={() => { setEditingProblem(null); loadData(courseId!, topicId!); }}
      />
    </div>
  );
}


// ===== ProblemCard — flip effekti bilan =====
function ProblemCard({ problem, index, courseId, topicId, onStartEdit, onDelete, onUpdate }: {
  problem: Problem; index: number; courseId: string; topicId: string;
  onStartEdit: (p: Problem) => void; onDelete: (id: string) => void; onUpdate: () => void;
}) {
  const [flipped, setFlipped] = useState(false);
  const [showVideo, setShowVideo] = useState(false);

  const difficultyColors: Record<string, string> = { easy: "bg-green-100 text-green-700", medium: "bg-yellow-100 text-yellow-700", hard: "bg-red-100 text-red-700" };
  const difficultyLabels: Record<string, string> = { easy: "Oson", medium: "O'rta", hard: "Qiyin" };

  // YouTube embed URL yaratish
  function getEmbedUrl(url: string): string {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?]+)/);
    const videoId = match ? match[1] : "";
    const params = new URLSearchParams(url.split("?")[1] || "");
    const start = params.get("start") || "0";
    const end = params.get("end");
    let embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&start=${start}`;
    if (end) embedUrl += `&end=${end}`;
    return embedUrl;
  }

  return (
    <>
      <div className={`bg-white rounded-xl border border-gray-100 shadow-sm transition-all duration-300 ${flipped ? "ring-2 ring-blue-300" : ""}`}>
        <div style={{ perspective: "1600px" }}>
          <div
            className="grid transition-transform duration-500"
            style={{ transformStyle: "preserve-3d", transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)" }}
          >
            {/* FRONT — Misol */}
            <div
              className="p-6 col-start-1 row-start-1"
              style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-primary-50 rounded-full flex items-center justify-center text-primary-600 font-bold text-sm shrink-0">{index + 1}</div>
                  <div>
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${difficultyColors[problem.difficulty] || ""}`}>{difficultyLabels[problem.difficulty] || problem.difficulty}</span>
                      {problem.isPremium && <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">Premium</span>}
                      {problem.tags?.map((tag) => <span key={tag} className="text-xs text-gray-500">#{tag}</span>)}
                      {problem.estimatedMinutes && <span className="text-xs text-gray-400">⏱ {problem.estimatedMinutes} daq</span>}
                    </div>
                    <p className="text-gray-900 font-medium"><LatexText text={problem.content} /></p>
                    {problem.image && <img src={problem.image} alt="" className="mt-2 max-h-40 rounded-lg border border-gray-200" />}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={async () => { const v = !problem.isPremium; await updateProblem(courseId, topicId, problem.id, { isPremium: v }); onUpdate(); }} className={`px-2.5 py-1 rounded text-[10px] font-medium border transition-colors ${problem.isPremium ? "border-yellow-200 text-yellow-700 bg-yellow-50 hover:bg-yellow-100" : "border-green-200 text-green-700 bg-green-50 hover:bg-green-100"}`} title={problem.isPremium ? "Free qilish" : "Premium qilish"}>{problem.isPremium ? "🔒 Premium" : "🔓 Free"}</button>
                  <button onClick={async () => { await updateProblem(courseId, topicId, problem.id, { isHidden: !problem.isHidden }); onUpdate(); }} className={`px-2 py-1 rounded text-[10px] font-medium border flex items-center gap-0.5 ${problem.isHidden ? "border-orange-200 text-orange-600 bg-orange-50" : "border-gray-200 text-gray-500 bg-gray-50"}`} title={problem.isHidden ? "Yashirin — ko'rsatish" : "Yashirish"}>{problem.isHidden ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}</button>
                  <button onClick={() => onStartEdit(problem)} className="p-2 text-gray-400 hover:text-primary-600 rounded-lg hover:bg-gray-50"><Edit className="w-4 h-4" /></button>
                  <button onClick={() => onDelete(problem.id)} className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-3 mt-4 pt-3 border-t border-gray-100">
                {problem.solution && problem.solution.length > 0 && (
                  <button onClick={() => setFlipped(true)} className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 text-sm font-medium rounded-lg hover:bg-blue-100 transition-colors">
                    <Eye className="w-4 h-4" /> Yechimni ko'rish
                  </button>
                )}
                {problem.videoUrl && (
                  <button onClick={() => setShowVideo(true)} className="flex items-center gap-2 px-3 py-2 bg-purple-50 text-purple-600 text-sm font-medium rounded-lg hover:bg-purple-100 transition-colors">
                    <Video className="w-4 h-4" /> Video yechim
                  </button>
                )}
              </div>
            </div>

            {/* BACK — Yechim */}
            <div
              className="p-6 bg-blue-50/50 col-start-1 row-start-1 rounded-xl"
              style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
            >
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-bold text-blue-700">📖 Yechim — #{index + 1}</h4>
                <button onClick={() => setFlipped(false)} className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 bg-white rounded border border-gray-200">← Misolga qaytish</button>
              </div>
              <div className="bg-white rounded-lg p-4 border border-blue-200">
                {problem.solution?.map((step) => (
                  <p key={step.stepNumber} className="text-sm text-gray-800 mb-1">
                    <span className="font-bold text-blue-600">{step.stepNumber}.</span> <LatexText text={step.text} />
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Video Modal */}
      {showVideo && problem.videoUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={() => setShowVideo(false)}>
          <div className="bg-white rounded-2xl w-full max-w-3xl shadow-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">🎬 Video yechim — #{index + 1}</h3>
              <button onClick={() => setShowVideo(false)} className="p-2 text-gray-400 hover:text-gray-600 text-lg">✕</button>
            </div>
            <div className="aspect-video bg-black">
              {problem.videoType === "youtube" || problem.videoUrl.includes("youtube") || problem.videoUrl.includes("youtu.be") ? (
                <iframe
                  src={getEmbedUrl(problem.videoUrl)}
                  className="w-full h-full"
                  allowFullScreen
                  allow="autoplay; encrypted-media"
                />
              ) : (
                <video src={problem.videoUrl} controls autoPlay className="w-full h-full" />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
