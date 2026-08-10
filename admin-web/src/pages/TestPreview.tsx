import { useParams, Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { ChevronRight, ArrowLeft, Loader2, Edit, Trash2, Clock, Plus, GripVertical, Shuffle, Timer, TimerOff, Check, X, Save } from "lucide-react";
import { getTestById, getCourseById, updateTest, deleteTest, getAllTBQuestions, saveTBQuestion } from "@shared/repositories";
import type { Test, Course, Question } from "@shared/types";
import LatexText from "../components/LatexText";
import LoadingButton from "../components/LoadingButton";

const difficultyColors: Record<string, string> = {
  easy: "text-green-600 bg-green-50",
  medium: "text-yellow-600 bg-yellow-50",
  hard: "text-red-600 bg-red-50",
};
const difficultyLabels: Record<string, string> = { easy: "Oson", medium: "O'rta", hard: "Qiyin" };

export default function TestPreview() {
  const { courseId, testId } = useParams<{ courseId: string; testId: string }>();
  const navigate = useNavigate();
  const [test, setTest] = useState<Test | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  // Test sozlamalari
  const [shuffleQuestions, setShuffleQuestions] = useState(false);
  const [shuffleOptions, setShuffleOptions] = useState(false);
  const [timerEnabled, setTimerEnabled] = useState(true);
  const [totalTime, setTotalTime] = useState(20);

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
      if (t) {
        setTitleValue(t.title);
        setQuestions([...t.questions]);
        setShuffleQuestions(t.shuffleQuestions || false);
        setShuffleOptions((t as any).shuffleOptions || false);
        setTimerEnabled((t as any).timerEnabled !== false);
        setTotalTime(t.totalTime || 20);
      }
    } catch (err) {
      console.error("Xatolik:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!courseId || !testId) return;
    setSaving(true);
    try {
      const updatedTest: Partial<Test> = {
        title: titleValue.trim() || test?.title,
        questions,
        shuffleQuestions,
        totalTime: timerEnabled ? totalTime : 0,
        totalPoints: questions.reduce((sum, q) => sum + (q.points || 1), 0),
        updatedAt: Date.now(),
      };
      // Qo'shimcha sozlamalar
      (updatedTest as any).shuffleOptions = shuffleOptions;
      (updatedTest as any).timerEnabled = timerEnabled;

      await updateTest(courseId, testId, updatedTest as any);

      // Agar to'g'ri javob o'zgargan bo'lsa — test bazasida ham yangilash
      await syncCorrectAnswersToLibrary();

      setTest((prev) => prev ? { ...prev, ...updatedTest, questions } : prev);
      setHasChanges(false);
      setEditingTitle(false);
    } catch (err) {
      console.error("Saqlashda xatolik:", err);
      alert("Saqlashda xatolik yuz berdi");
    } finally {
      setSaving(false);
    }
  }

  /** Test bazasidagi savollarning correctAnswer ni ham yangilash */
  async function syncCorrectAnswersToLibrary() {
    try {
      const allLibQuestions = await getAllTBQuestions();
      for (const q of questions) {
        // problemId orqali yoki content bo'yicha mos savolni topish
        const libQ = allLibQuestions.find((lq: any) =>
          (q.problemId && lq.id === q.problemId) ||
          lq.content?.trim() === q.content?.trim()
        );
        if (libQ && libQ.correctAnswer !== q.correctAnswer) {
          await saveTBQuestion({ ...libQ, correctAnswer: q.correctAnswer });
        }
      }
    } catch {
      // Library sync muvaffaqiyatsiz bo'lsa ham asosiy saqlash ishlaydi
    }
  }

  function handleChangeCorrectAnswer(qIdx: number, newAnswer: string) {
    const updated = [...questions];
    updated[qIdx] = { ...updated[qIdx], correctAnswer: newAnswer };
    setQuestions(updated);
    setHasChanges(true);
  }

  function handleDeleteQuestion(qIdx: number) {
    if (!confirm(`${qIdx + 1}-savolni o'chirishga ishonchingiz komilmi?`)) return;
    const updated = questions.filter((_, i) => i !== qIdx);
    setQuestions(updated);
    setHasChanges(true);
  }

  function handleDragStart(idx: number) {
    setDragIdx(idx);
  }

  function handleDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    const updated = [...questions];
    const [moved] = updated.splice(dragIdx, 1);
    updated.splice(idx, 0, moved);
    setQuestions(updated);
    setDragIdx(idx);
    setHasChanges(true);
  }

  function handleDragEnd() {
    setDragIdx(null);
  }

  async function handleSaveTitle() {
    setEditingTitle(false);
    setHasChanges(true);
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

  const easyCount = questions.filter((q) => q.difficulty === "easy").length;
  const mediumCount = questions.filter((q) => q.difficulty === "medium").length;
  const hardCount = questions.filter((q) => q.difficulty === "hard").length;

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
          <span className="text-gray-900 font-medium">Test tahrirlash</span>
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
                    className="text-xl font-bold px-2 py-1 border border-primary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 w-full"
                    autoFocus
                  />
                  <button onClick={handleSaveTitle} className="text-green-600 font-bold text-xl">✓</button>
                  <button onClick={() => setEditingTitle(false)} className="text-gray-400 text-xl">✕</button>
                </div>
              ) : (
                <h1 className="text-2xl font-bold text-gray-900 cursor-pointer hover:text-primary-500" onClick={() => setEditingTitle(true)}>{titleValue || test.title}</h1>
              )}
              <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                <span className="flex items-center gap-1"><Clock className="w-4 h-4" />{timerEnabled ? `${totalTime} daqiqa` : "Vaqtsiz"}</span>
                <span>📝 {questions.length} savol</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${test.status === "published" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                  {test.status === "published" ? "Chop etilgan" : "Qoralama"}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {hasChanges && (
                <LoadingButton onClick={handleSave} loading={saving} className="btn-primary flex items-center gap-2 text-sm">
                  <Save className="w-4 h-4" /> Saqlash
                </LoadingButton>
              )}
              <button onClick={handleDelete} className="btn-outline flex items-center gap-2 text-sm text-red-600 border-red-200 hover:bg-red-50">
                <Trash2 className="w-4 h-4" /> O'chirish
              </button>
            </div>
          </div>
        </div>

        {/* Question list */}
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-gray-900">Savollar <span className="text-gray-500 font-normal ml-2">{questions.length} ta</span></h2>
        </div>

        <div className="space-y-4">
          {questions.map((q, idx) => (
            <div
              key={q.id || idx}
              draggable
              onDragStart={() => handleDragStart(idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDragEnd={handleDragEnd}
              className={`bg-white rounded-xl border shadow-sm p-6 transition-all ${dragIdx === idx ? "opacity-50 scale-[0.98] border-primary-300" : "border-gray-100"}`}
            >
              {/* Question header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500">
                    <GripVertical className="w-5 h-5" />
                  </div>
                  <span className="w-8 h-8 bg-primary-500 text-white rounded-full flex items-center justify-center font-bold text-sm">
                    {idx + 1}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${difficultyColors[q.difficulty] || "bg-gray-100 text-gray-700"}`}>
                    {difficultyLabels[q.difficulty] || q.difficulty}
                  </span>
                </div>
                <button
                  onClick={() => handleDeleteQuestion(idx)}
                  className="text-gray-300 hover:text-red-500 transition-colors"
                  title="Savolni o'chirish"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Question content */}
              <div className="text-gray-900 font-medium mb-4"><LatexText text={q.content} /></div>

              {/* Options — to'g'ri javobni o'zgartirish mumkin */}
              {q.options && q.options.length > 0 && (
                <div className="grid grid-cols-2 gap-3">
                  {q.options.map((opt) => {
                    const isCorrect = q.correctAnswer === opt.label;
                    return (
                      <button
                        key={opt.label}
                        onClick={() => handleChangeCorrectAnswer(idx, opt.label)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg border text-sm text-left transition-all ${
                          isCorrect
                            ? "border-green-300 bg-green-50 ring-1 ring-green-200"
                            : "border-gray-200 bg-gray-50 hover:border-primary-200 hover:bg-primary-50"
                        }`}
                        title={isCorrect ? "To'g'ri javob" : "To'g'ri deb belgilash"}
                      >
                        <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                          isCorrect ? "bg-green-500 text-white" : "bg-gray-200 text-gray-500"
                        }`}>
                          {opt.label}
                        </span>
                        <span className="text-gray-700 flex-1">{opt.text ? <LatexText text={opt.text} /> : "(kiritilmagan)"}</span>
                        {isCorrect && <Check className="w-4 h-4 text-green-600 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>

        {questions.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
            <p className="text-4xl mb-3">📝</p>
            <p className="text-gray-500">Bu testda hali savol yo'q</p>
          </div>
        )}

        {/* Saqlash (pastda ham) */}
        {hasChanges && (
          <div className="sticky bottom-4 z-10">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between shadow-lg">
              <p className="text-sm text-amber-800 font-medium">⚠️ O'zgarishlar saqlanmagan</p>
              <LoadingButton onClick={handleSave} loading={saving} className="btn-primary flex items-center gap-2 text-sm">
                <Save className="w-4 h-4" /> Saqlash
              </LoadingButton>
            </div>
          </div>
        )}

        <div className="text-center py-4">
          <Link to={`/courses/${courseId}`} className="text-sm text-primary-500 hover:underline">← Kursga qaytish</Link>
        </div>
      </div>

      {/* Right sidebar — sozlamalar */}
      <div className="w-72 shrink-0">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 sticky top-6 space-y-5">
          <h3 className="font-semibold text-gray-900">⚙️ Test sozlamalari</h3>

          {/* Timer */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700 flex items-center gap-2">
                {timerEnabled ? <Timer className="w-4 h-4 text-primary-500" /> : <TimerOff className="w-4 h-4 text-gray-400" />}
                Vaqt taymeri
              </span>
              <button
                onClick={() => { setTimerEnabled(!timerEnabled); setHasChanges(true); }}
                className={`relative w-11 h-6 rounded-full transition-colors ${timerEnabled ? "bg-primary-500" : "bg-gray-300"}`}
              >
                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${timerEnabled ? "left-[22px]" : "left-0.5"}`} />
              </button>
            </div>
            {timerEnabled && (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={totalTime}
                  onChange={(e) => { setTotalTime(Math.max(1, Number(e.target.value))); setHasChanges(true); }}
                  className="w-20 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-center"
                  min={1}
                />
                <span className="text-sm text-gray-500">daqiqa</span>
              </div>
            )}
          </div>

          {/* Shuffle questions */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700 flex items-center gap-2">
              <Shuffle className="w-4 h-4 text-blue-500" />
              Savollar aralash
            </span>
            <button
              onClick={() => { setShuffleQuestions(!shuffleQuestions); setHasChanges(true); }}
              className={`relative w-11 h-6 rounded-full transition-colors ${shuffleQuestions ? "bg-primary-500" : "bg-gray-300"}`}
            >
              <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${shuffleQuestions ? "left-[22px]" : "left-0.5"}`} />
            </button>
          </div>

          {/* Shuffle options */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700 flex items-center gap-2">
              <Shuffle className="w-4 h-4 text-purple-500" />
              Variantlar aralash
            </span>
            <button
              onClick={() => { setShuffleOptions(!shuffleOptions); setHasChanges(true); }}
              className={`relative w-11 h-6 rounded-full transition-colors ${shuffleOptions ? "bg-primary-500" : "bg-gray-300"}`}
            >
              <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${shuffleOptions ? "left-[22px]" : "left-0.5"}`} />
            </button>
          </div>

          {shuffleOptions && (
            <p className="text-[11px] text-purple-600 bg-purple-50 rounded-lg p-2.5 leading-relaxed">
              💡 Variantlar aralash ko'rsatilganda, to'g'ri javob yangi pozitsiyaga mos label oladi. Masalan: A javob 3-qatorda bo'lsa, student'ga C sifatida ko'rinadi.
            </p>
          )}

          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs text-gray-500 uppercase font-medium mb-3">Statistika</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Savollar</span><span className="font-medium">{questions.length}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Oson</span><span className="font-medium text-green-600">{easyCount}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">O'rta</span><span className="font-medium text-yellow-600">{mediumCount}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Qiyin</span><span className="font-medium text-red-600">{hardCount}</span></div>
            </div>
          </div>

          {/* Actions */}
          <div className="border-t border-gray-100 pt-4 space-y-2">
            <button
              onClick={handleToggleStatus}
              className={`w-full text-sm font-medium py-2.5 rounded-lg ${test.status === "published" ? "btn-outline" : "btn-primary"}`}
            >
              {test.status === "published" ? "Qoralamaga qaytarish" : "Chop etish (Publish)"}
            </button>
            <Link to={`/courses/${courseId}`} className="w-full btn-outline text-sm flex items-center justify-center gap-2">
              <ArrowLeft className="w-4 h-4" /> Kursga qaytish
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
