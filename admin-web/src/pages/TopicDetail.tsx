import { useParams, Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { ChevronRight, Plus, Edit, Trash2, Play, Loader2, Lock, Unlock } from "lucide-react";
import { getTopicById, getProblemsByTopic, updateTopic, deleteTopic, deleteProblem, updateProblem } from "@shared/repositories";
import type { Topic, Problem } from "@shared/types";
import CreateProblemModal from "../components/CreateProblemModal";

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
  const [editingProblemId, setEditingProblemId] = useState<string | null>(null);
  const [editProblemContent, setEditProblemContent] = useState("");
  const [editProblemVideo, setEditProblemVideo] = useState("");
  const [editProblemDifficulty, setEditProblemDifficulty] = useState<string>("easy");

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

  function startEditProblem(problem: Problem) {
    setEditingProblemId(problem.id);
    setEditProblemContent(problem.content);
    setEditProblemVideo(problem.videoUrl || "");
    setEditProblemDifficulty(problem.difficulty);
  }

  async function handleSaveProblem(problemId: string) {
    if (!courseId || !topicId) return;
    await updateProblem(courseId, topicId, problemId, {
      content: editProblemContent,
      videoUrl: editProblemVideo || undefined,
      difficulty: editProblemDifficulty as any,
    });
    setProblems((prev) => prev.map((p) =>
      p.id === problemId ? { ...p, content: editProblemContent, videoUrl: editProblemVideo, difficulty: editProblemDifficulty as any } : p
    ));
    setEditingProblemId(null);
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
          <div key={problem.id} className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
            {editingProblemId === problem.id ? (
              /* EDIT MODE */
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-primary-600">#{index + 1} tahrirlash</span>
                  <select value={editProblemDifficulty} onChange={(e) => setEditProblemDifficulty(e.target.value)} className="text-xs border border-gray-200 rounded-lg px-2 py-1">
                    <option value="easy">Oson</option>
                    <option value="medium">O'rta</option>
                    <option value="hard">Qiyin</option>
                  </select>
                </div>
                <textarea
                  value={editProblemContent}
                  onChange={(e) => setEditProblemContent(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                  placeholder="Misol matni (LaTeX: $$formula$$)"
                />
                <input
                  value={editProblemVideo}
                  onChange={(e) => setEditProblemVideo(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Video URL (YouTube)"
                />
                <div className="flex gap-2">
                  <button onClick={() => handleSaveProblem(problem.id)} className="btn-primary text-sm">Saqlash</button>
                  <button onClick={() => setEditingProblemId(null)} className="btn-outline text-sm">Bekor</button>
                </div>
              </div>
            ) : (
              /* VIEW MODE */
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-primary-50 rounded-full flex items-center justify-center text-primary-600 font-bold text-sm shrink-0">
                  {index + 1}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${difficultyColors[problem.difficulty] || ""}`}>
                      {difficultyLabels[problem.difficulty] || problem.difficulty}
                    </span>
                    {problem.tags?.map((tag) => (
                      <span key={tag} className="text-xs text-gray-500">#{tag}</span>
                    ))}
                    {problem.estimatedMinutes && (
                      <span className="text-xs text-gray-400">⏱ {problem.estimatedMinutes} daq</span>
                    )}
                  </div>
                  <p className="text-gray-900 font-medium">{problem.content}</p>

                  {/* Solution */}
                  {problem.solution && problem.solution.length > 0 && (
                    <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                      <p className="text-xs font-semibold text-blue-700 mb-1">Yechim:</p>
                      {problem.solution.map((step) => (
                        <p key={step.stepNumber} className="text-sm text-blue-800">
                          {step.stepNumber}. {step.text}
                        </p>
                      ))}
                    </div>
                  )}

                  {/* Video */}
                  {problem.videoUrl && (
                    <div className="mt-3 flex items-center gap-2 text-sm text-primary-500">
                      <Play className="w-4 h-4" />
                      <a href={problem.videoUrl} target="_blank" rel="noreferrer" className="hover:underline">
                        Video yechimni ko'rish ({problem.videoType === "youtube" ? "YouTube" : "Upload"})
                      </a>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => startEditProblem(problem)} className="p-2 text-gray-400 hover:text-primary-600 rounded-lg hover:bg-gray-50" title="Tahrirlash">
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteProblem(problem.id)}
                  className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                  title="O'chirish"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            )}
          </div>
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
    </div>
  );
}
