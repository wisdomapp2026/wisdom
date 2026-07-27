import { useParams, Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { ChevronRight, ArrowLeft, Loader2, Edit, Trash2, Clock } from "lucide-react";
import { getTestById, getCourseById, updateTest, deleteTest } from "@shared/repositories";
import type { Test, Course, Question } from "@shared/types";
import LatexText from "../components/LatexText";

const difficultyColors: Record<string, string> = {
  easy: "text-green-600 bg-green-50",
  medium: "text-yellow-600 bg-yellow-50",
  hard: "text-red-600 bg-red-50",
};
const difficultyLabels: Record<string, string> = { easy: "Oson", medium: "O'rta", hard: "Qiyin" };

const typeColors: Record<string, string> = {
  multiple_choice: "bg-blue-100 text-blue-700",
  true_false: "bg-purple-100 text-purple-700",
  short_answer: "bg-green-100 text-green-700",
};
const typeLabels: Record<string, string> = {
  multiple_choice: "Ko'p tanlovli",
  true_false: "Ha / Yo'q",
  short_answer: "Qisqa javob",
};

export default function TestPreview() {
  const { courseId, testId } = useParams<{ courseId: string; testId: string }>();
  const navigate = useNavigate();
  const [test, setTest] = useState<Test | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState("");

  useEffect(() => {
    if (courseId && testId) loadData();
  }, [courseId, testId]);

  async function loadData() {
    setLoading(true);
    try {
      const [t, c] = await Promise.all([
        getTestById(courseId!, testId!),
        getCourseById(courseId!),
      ]);
      setTest(t);
      setCourse(c);
      if (t) setTitleValue(t.title);
    } catch (err) {
      console.error("Xatolik:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveTitle() {
    if (!titleValue.trim() || !courseId || !testId) return;
    await updateTest(courseId, testId, { title: titleValue.trim() });
    setTest((prev) => prev ? { ...prev, title: titleValue.trim() } : prev);
    setEditingTitle(false);
  }

  async function handleDelete() {
    if (!confirm("Bu testni o'chirishga ishonchingiz komilmi?")) return;
    await deleteTest(courseId!, testId!);
    navigate(`/courses/${courseId}`);
  }

  async function handleToggleStatus() {
    if (!test || !courseId || !testId) return;
    const newStatus = test.status === "published" ? "draft" : "published";
    await updateTest(courseId, testId, { status: newStatus });
    setTest((prev) => prev ? { ...prev, status: newStatus } : prev);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  if (!test) {
    return (
      <div className="text-center py-20">
        <p className="text-4xl mb-3">❌</p>
        <p className="text-gray-500">Test topilmadi</p>
        <Link to={`/courses/${courseId}`} className="text-primary-500 hover:underline mt-4 inline-block">← Kursga qaytish</Link>
      </div>
    );
  }

  const easyCount = test.questions.filter((q) => q.difficulty === "easy").length;
  const mediumCount = test.questions.filter((q) => q.difficulty === "medium").length;
  const hardCount = test.questions.filter((q) => q.difficulty === "hard").length;

  return (
    <div className="flex gap-6">
      {/* Main content */}
      <div className="flex-1 space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Link to="/courses" className="hover:text-primary-500">Kurslar</Link>
          <ChevronRight className="w-4 h-4" />
          <Link to={`/courses/${courseId}`} className="hover:text-primary-500">{course?.title || "Kurs"}</Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-gray-900 font-medium">Test Preview</span>
        </div>

        {/* Test header */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              {editingTitle ? (
                <div className="flex items-center gap-2">
                  <input
                    value={titleValue}
                    onChange={(e) => setTitleValue(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleSaveTitle(); if (e.key === "Escape") setEditingTitle(false); }}
                    className="text-xl font-bold px-2 py-1 border border-primary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    autoFocus
                  />
                  <button onClick={handleSaveTitle} className="text-green-600 font-bold">✓</button>
                  <button onClick={() => setEditingTitle(false)} className="text-gray-400">✕</button>
                </div>
              ) : (
                <h1 className="text-2xl font-bold text-gray-900">{test.title}</h1>
              )}
              {test.description && <p className="text-gray-500 mt-1">{test.description}</p>}
              <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                <span className="flex items-center gap-1"><Clock className="w-4 h-4" />{test.totalTime} daqiqa</span>
                <span>📝 {test.questions.length} savol</span>
                <span>🎯 {test.totalPoints} ball</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${test.status === "published" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                  {test.status === "published" ? "Chop etilgan" : "Qoralama"}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setEditingTitle(true)} className="btn-outline flex items-center gap-2 text-sm">
                <Edit className="w-4 h-4" /> Tahrirlash
              </button>
              <button onClick={handleDelete} className="btn-outline flex items-center gap-2 text-sm text-red-600 border-red-200 hover:bg-red-50">
                <Trash2 className="w-4 h-4" /> O'chirish
              </button>
            </div>
          </div>
        </div>

        {/* Question list */}
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-gray-900">Savollar <span className="text-gray-500 font-normal ml-2">{test.questions.length} ta</span></h2>
        </div>

        <div className="space-y-4">
          {test.questions.map((q, idx) => (
            <div key={q.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              {/* Question header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 bg-primary-500 text-white rounded-full flex items-center justify-center font-bold text-sm">
                    {idx + 1}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${typeColors[q.type] || "bg-gray-100 text-gray-700"}`}>
                    {typeLabels[q.type] || q.type}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span>🎯 {q.points} ball</span>
                  <span>⏱ {q.estimatedMinutes} daq</span>
                  <span className={`px-2 py-0.5 rounded-full ${difficultyColors[q.difficulty] || ""}`}>
                    {difficultyLabels[q.difficulty] || q.difficulty}
                  </span>
                </div>
              </div>

              {/* Question content */}
              <div className="text-gray-900 font-medium mb-4"><LatexText text={q.content} /></div>

              {/* Options */}
              {q.options && q.options.length > 0 && (
                <div className="grid grid-cols-2 gap-3">
                  {q.options.map((opt) => (
                    <div
                      key={opt.label}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg border text-sm ${
                        q.correctAnswer === opt.label
                          ? "border-green-300 bg-green-50"
                          : "border-gray-200 bg-gray-50"
                      }`}
                    >
                      <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                        q.correctAnswer === opt.label ? "bg-green-500 text-white" : "bg-gray-200 text-gray-500"
                      }`}>
                        {opt.label}
                      </span>
                      <span className="text-gray-700">{opt.text ? <LatexText text={opt.text} /> : "(kiritilmagan)"}</span>
                      {q.correctAnswer === opt.label && <span className="ml-auto text-xs text-green-600">✓</span>}
                    </div>
                  ))}
                </div>
              )}

              {q.type === "short_answer" && !q.options?.length && (
                <div className="px-4 py-6 bg-gray-50 rounded-lg border border-gray-200 border-dashed">
                  <p className="text-sm text-gray-400 italic text-center">O'quvchi javob yozadi</p>
                </div>
              )}

              {/* Tags */}
              {q.tags && q.tags.length > 0 && (
                <div className="flex items-center gap-2 mt-3">
                  {q.tags.map((tag) => (
                    <span key={tag} className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded">#{tag}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {test.questions.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
            <p className="text-4xl mb-3">📝</p>
            <p className="text-gray-500">Bu testda hali savol yo'q</p>
          </div>
        )}

        <div className="text-center py-4">
          <Link to={`/courses/${courseId}`} className="text-sm text-primary-500 hover:underline">
            ← Kursga qaytish
          </Link>
        </div>
      </div>

      {/* Right sidebar */}
      <div className="w-72 shrink-0">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 sticky top-6">
          <h3 className="font-semibold text-gray-900 mb-4">📊 Test statistikasi</h3>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 mb-4 text-center">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Umumiy vaqt</p>
              <p className="text-lg font-bold text-primary-500">{test.totalTime} daq</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Umumiy ball</p>
              <p className="text-lg font-bold text-primary-500">{test.totalPoints}</p>
            </div>
          </div>

          {/* Difficulty breakdown */}
          <div className="mb-4">
            <p className="text-xs text-gray-500 uppercase mb-2">Qiyinlik taqsimoti</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2"><span className="w-3 h-3 bg-green-500 rounded-full"></span> Oson</span>
                <span className="font-medium">{easyCount}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2"><span className="w-3 h-3 bg-yellow-500 rounded-full"></span> O'rta</span>
                <span className="font-medium">{mediumCount}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2"><span className="w-3 h-3 bg-red-500 rounded-full"></span> Qiyin</span>
                <span className="font-medium">{hardCount}</span>
              </div>
            </div>
          </div>

          {/* Configuration */}
          <div className="space-y-3 text-sm border-t border-gray-100 pt-4">
            <p className="text-xs text-gray-500 uppercase font-medium">Sozlamalar</p>
            <div className="flex justify-between"><span className="text-gray-500">O'tish bali</span><span className="font-medium">{test.passingScore} / {test.totalPoints}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Aralash savollar</span><span className="font-medium">{test.shuffleQuestions ? "Ha" : "Yo'q"}</span></div>
            {test.gradeLevel && <div className="flex justify-between"><span className="text-gray-500">Sinf</span><span className="font-medium">{test.gradeLevel}</span></div>}
          </div>

          {/* Actions */}
          <div className="mt-6 space-y-2">
            <button
              onClick={handleToggleStatus}
              className={`w-full text-sm font-medium py-2.5 rounded-lg ${test.status === "published" ? "btn-outline" : "btn-primary"}`}
            >
              {test.status === "published" ? "Qoralamaga qaytarish" : "Chop etish (Publish)"}
            </button>
            <Link
              to={`/courses/${courseId}`}
              className="w-full btn-outline text-sm flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Kursga qaytish
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
