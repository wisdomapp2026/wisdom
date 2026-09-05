import { useParams, Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  ChevronRight,
  Plus,
  Edit,
  Trash2,
  Save,
  BookOpen,
  FileText,
  HelpCircle,
  Video,
  Image as ImageIcon,
  CheckCircle,
  X,
  Search,
  Volume2,
  ArrowLeft,
  ExternalLink,
  Layers,
  Sparkles,
} from "lucide-react";
import {
  getTopicById,
  updateTopic,
  deleteTopic,
  getVocabularies,
  getVocabulariesByIds,
} from "@shared/repositories";
import type { Topic, Vocabulary, TopicQuizQuestion } from "@shared/types";
import RichTextEditor from "../components/RichTextEditor";

export default function TopicDetail() {
  const { courseId, topicId } = useParams<{ courseId: string; topicId: string }>();
  const navigate = useNavigate();

  const [topic, setTopic] = useState<Topic | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"theory" | "vocabulary" | "quiz">("theory");

  // Topic Header Edit
  const [editingHeader, setEditingHeader] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  // Theory State
  const [theoryContent, setTheoryContent] = useState("");
  const [mediaList, setMediaList] = useState<Array<{ id: string; type: "image" | "video"; url: string; caption?: string }>>([]);
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [newMedia, setNewMedia] = useState<{ type: "image" | "video"; url: string; caption: string }>({
    type: "image",
    url: "",
    caption: "",
  });
  const [savingTheory, setSavingTheory] = useState(false);

  // Vocabulary State
  const [attachedVocabs, setAttachedVocabs] = useState<Vocabulary[]>([]);
  const [showVocabModal, setShowVocabModal] = useState(false);
  const [allVocabularies, setAllVocabularies] = useState<Vocabulary[]>([]);
  const [vocabSearch, setVocabSearch] = useState("");
  const [selectedVocabIds, setSelectedVocabIds] = useState<Set<string>>(new Set());
  const [savingVocabs, setSavingVocabs] = useState(false);

  // Quiz State
  const [quizQuestions, setQuizQuestions] = useState<TopicQuizQuestion[]>([]);
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<TopicQuizQuestion | null>(null);
  const [quizForm, setQuizForm] = useState<{
    question: string;
    options: string[];
    correctAnswer: number;
    explanation: string;
  }>({
    question: "",
    options: ["", "", "", ""],
    correctAnswer: 0,
    explanation: "",
  });
  const [savingQuiz, setSavingQuiz] = useState(false);

  useEffect(() => {
    if (courseId && topicId) {
      loadTopicData();
    }
  }, [courseId, topicId]);

  async function loadTopicData() {
    setLoading(true);
    try {
      const t = await getTopicById(courseId!, topicId!);
      if (t) {
        setTopic(t);
        setTitle(t.title || "");
        setDescription(t.description || "");
        setTheoryContent(t.theoryContent || "");
        setMediaList((t.theoryMedia as any) || []);
        setQuizQuestions(t.quizQuestions || []);

        // Lug'atlarni yuklash
        if (t.vocabularyIds && t.vocabularyIds.length > 0) {
          const vocabs = await getVocabulariesByIds(t.vocabularyIds);
          setAttachedVocabs(vocabs);
          setSelectedVocabIds(new Set(t.vocabularyIds));
        } else {
          setAttachedVocabs([]);
          setSelectedVocabIds(new Set());
        }
      }
    } catch (err) {
      console.error("Mavzu ma'lumotlarini yuklashda xatolik:", err);
    } finally {
      setLoading(false);
    }
  }

  // Sarlavhani saqlash
  async function handleSaveHeader() {
    if (!title.trim()) return;
    try {
      await updateTopic(courseId!, topicId!, { title, description });
      setTopic((prev) => (prev ? { ...prev, title, description } : null));
      setEditingHeader(false);
    } catch (err: any) {
      alert("Xatolik: " + err.message);
    }
  }

  // Teoriya bo'limini saqlash
  async function handleSaveTheory() {
    setSavingTheory(true);
    try {
      await updateTopic(courseId!, topicId!, {
        theoryContent,
        theoryMedia: mediaList,
      });
      setTopic((prev) => (prev ? { ...prev, theoryContent, theoryMedia: mediaList } : null));
      alert("Teoriya muvaffaqiyatli saqlandi!");
    } catch (err: any) {
      alert("Xatolik yuz berdi: " + err.message);
    } finally {
      setSavingTheory(false);
    }
  }

  // Media qo'shish
  function handleAddMedia() {
    if (!newMedia.url.trim()) {
      alert("Media havolasi (URL) kiritilishi shart!");
      return;
    }
    const item = {
      id: "m_" + Date.now(),
      type: newMedia.type,
      url: newMedia.url.trim(),
      caption: newMedia.caption.trim(),
    };
    setMediaList((prev) => [...prev, item]);
    setNewMedia({ type: "image", url: "", caption: "" });
    setShowMediaModal(false);
  }

  function handleRemoveMedia(id: string) {
    setMediaList((prev) => prev.filter((m) => m.id !== id));
  }

  // Lug'atlar bazasidan modal ochish
  async function openVocabModal() {
    try {
      const all = await getVocabularies();
      setAllVocabularies(all);
      setSelectedVocabIds(new Set(topic?.vocabularyIds || []));
      setShowVocabModal(true);
    } catch (err: any) {
      alert("Lug'at bazasini yuklashda xatolik: " + err.message);
    }
  }

  function toggleSelectVocab(id: string) {
    setSelectedVocabIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSaveAttachedVocabs() {
    setSavingVocabs(true);
    try {
      const ids = Array.from(selectedVocabIds);
      await updateTopic(courseId!, topicId!, {
        vocabularyIds: ids,
      });
      const vocabs = await getVocabulariesByIds(ids);
      setAttachedVocabs(vocabs);
      setTopic((prev) => (prev ? { ...prev, vocabularyIds: ids } : null));
      setShowVocabModal(false);
      alert(`Mavzuga ${ids.length} ta so'z biriktirildi!`);
    } catch (err: any) {
      alert("Xatolik: " + err.message);
    } finally {
      setSavingVocabs(false);
    }
  }

  async function handleRemoveAttachedVocab(id: string) {
    const nextIds = (topic?.vocabularyIds || []).filter((vId) => vId !== id);
    try {
      await updateTopic(courseId!, topicId!, { vocabularyIds: nextIds });
      setAttachedVocabs((prev) => prev.filter((v) => v.id !== id));
      setTopic((prev) => (prev ? { ...prev, vocabularyIds: nextIds } : null));
    } catch (err: any) {
      alert("O'chirishda xatolik: " + err.message);
    }
  }

  // Quiz operatsiyalari
  function openAddQuizModal() {
    setEditingQuestion(null);
    setQuizForm({
      question: "",
      options: ["", "", "", ""],
      correctAnswer: 0,
      explanation: "",
    });
    setShowQuizModal(true);
  }

  function openEditQuizModal(q: TopicQuizQuestion) {
    setEditingQuestion(q);
    setQuizForm({
      question: q.question,
      options: [...q.options],
      correctAnswer: q.correctAnswer,
      explanation: q.explanation || "",
    });
    setShowQuizModal(true);
  }

  async function handleSaveQuizQuestion(e: React.FormEvent) {
    e.preventDefault();
    if (!quizForm.question.trim()) {
      alert("Savol matnini kiriting!");
      return;
    }
    if (quizForm.options.some((opt) => !opt.trim())) {
      alert("Barcha 4 ta javob variantini to'ldiring!");
      return;
    }

    setSavingQuiz(true);
    try {
      let updated: TopicQuizQuestion[];
      if (editingQuestion) {
        updated = quizQuestions.map((q) =>
          q.id === editingQuestion.id ? { ...q, ...quizForm } : q
        );
      } else {
        const newQ: TopicQuizQuestion = {
          id: "q_" + Date.now(),
          ...quizForm,
        };
        updated = [...quizQuestions, newQ];
      }

      await updateTopic(courseId!, topicId!, {
        quizQuestions: updated,
      });
      setQuizQuestions(updated);
      setTopic((prev) => (prev ? { ...prev, quizQuestions: updated } : null));
      setShowQuizModal(false);
    } catch (err: any) {
      alert("Quiz savolini saqlashda xatolik: " + err.message);
    } finally {
      setSavingQuiz(false);
    }
  }

  async function handleDeleteQuizQuestion(id: string) {
    if (!confirm("Savolni o'chirishga ishonchingiz komilmi?")) return;
    try {
      const updated = quizQuestions.filter((q) => q.id !== id);
      await updateTopic(courseId!, topicId!, { quizQuestions: updated });
      setQuizQuestions(updated);
      setTopic((prev) => (prev ? { ...prev, quizQuestions: updated } : null));
    } catch (err: any) {
      alert("O'chirishda xatolik: " + err.message);
    }
  }

  // Audio o'qish
  function playAudio(word: string) {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(word);
    u.lang = "en-US";
    u.rate = 0.9;
    window.speechSynthesis.speak(u);
  }

  if (loading) {
    return (
      <div className="p-8 text-center text-gray-500">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        Mavzu yuklanmoqda...
      </div>
    );
  }

  if (!topic) {
    return (
      <div className="p-8 text-center text-gray-500">
        Mavzu topilmadi.
        <br />
        <Link to={`/courses/${courseId}`} className="text-indigo-600 underline mt-2 inline-block">
          Kursga qaytish
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link to="/courses" className="hover:text-indigo-600">
          Kurslar
        </Link>
        <ChevronRight className="w-4 h-4" />
        <Link to={`/courses/${courseId}`} className="hover:text-indigo-600">
          Kurs tafsilotlari
        </Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-gray-900 font-medium">{topic.title}</span>
      </div>

      {/* Topic Header Card */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {editingHeader ? (
          <div className="w-full space-y-3">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-xl font-bold px-3 py-1.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              placeholder="Mavzu nomi..."
            />
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full text-sm text-gray-600 px-3 py-1.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              placeholder="Mavzu haqida qisqacha tavsif..."
            />
            <div className="flex gap-2">
              <button
                onClick={handleSaveHeader}
                className="px-4 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700"
              >
                Saqlash
              </button>
              <button
                onClick={() => setEditingHeader(false)}
                className="px-4 py-1.5 border border-gray-200 text-gray-600 rounded-xl text-xs hover:bg-gray-50"
              >
                Bekor qilish
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{topic.title}</h1>
              <button
                onClick={() => setEditingHeader(true)}
                className="p-1 text-gray-400 hover:text-indigo-600 rounded-lg hover:bg-gray-100"
              >
                <Edit className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              {topic.description || "Tavsif berilmagan."}
            </p>
          </div>
        )}

        <div className="flex items-center gap-3 shrink-0">
          <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded-full border border-indigo-100">
            {attachedVocabs.length} ta so'z
          </span>
          <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-full border border-emerald-100">
            {quizQuestions.length} ta savol
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 gap-8">
        <button
          onClick={() => setActiveTab("theory")}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === "theory"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-gray-500 hover:text-gray-900"
          }`}
        >
          <BookOpen className="w-4 h-4" />
          1. Dars Teoriyasi (Theory)
        </button>

        <button
          onClick={() => setActiveTab("vocabulary")}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === "vocabulary"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-gray-500 hover:text-gray-900"
          }`}
        >
          <Layers className="w-4 h-4" />
          2. Lug'atlar ({attachedVocabs.length})
        </button>

        <button
          onClick={() => setActiveTab("quiz")}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === "quiz"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-gray-500 hover:text-gray-900"
          }`}
        >
          <HelpCircle className="w-4 h-4" />
          3. Mavzu Quizi ({quizQuestions.length})
        </button>
      </div>

      {/* TAB 1: THEORY */}
      {activeTab === "theory" && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  Mavzu Nazariyasi (Dars matni)
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Talaba mavzuga kirganda o'qiydigan tushuntirish, qoidalar va matnlar.
                </p>
              </div>
              <button
                onClick={handleSaveTheory}
                disabled={savingTheory}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {savingTheory ? "Saqlanmoqda..." : "Teoriyani Saqlash"}
              </button>
            </div>

            <RichTextEditor
              value={theoryContent}
              onChange={setTheoryContent}
              placeholder="Mavzu tushuntirishini bu yerga yozing... (Grammatika qoidalari, dars matni, misollar, rasmlar, jadvallar)"
              minHeight="420px"
            />
          </div>

          {/* Media Section */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  Teoriya Rasmlari va Videolari
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  O'quvchi ushbu rasmlar va videolarni dars matnida to'liq ekranda ko'ra oladi.
                </p>
              </div>
              <button
                onClick={() => setShowMediaModal(true)}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 text-gray-700 hover:bg-gray-200 text-xs font-semibold rounded-xl transition-colors"
              >
                <Plus className="w-4 h-4" />
                Media Qo'shish
              </button>
            </div>

            {mediaList.length === 0 ? (
              <p className="text-xs text-gray-400 italic py-4">
                Hozircha hech qanday rasm yoki video biriktirilmagan.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {mediaList.map((m) => (
                  <div
                    key={m.id}
                    className="border border-gray-200 rounded-xl p-3 relative group overflow-hidden bg-gray-50"
                  >
                    <button
                      onClick={() => handleRemoveMedia(m.id)}
                      className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow-sm"
                      title="O'chirish"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    {m.type === "image" ? (
                      <img
                        src={m.url}
                        alt={m.caption || "Theory image"}
                        className="w-full h-40 object-cover rounded-lg mb-2"
                        onError={(e) => {
                          (e.target as any).src = "https://placehold.co/600x400?text=Rasm+Topilmadi";
                        }}
                      />
                    ) : (
                      <div className="w-full h-40 bg-gray-900 rounded-lg flex items-center justify-center mb-2 text-white">
                        <Video className="w-10 h-10 text-indigo-400" />
                      </div>
                    )}
                    <div className="flex items-center justify-between text-xs text-gray-600">
                      <span className="font-semibold uppercase tracking-wider text-[10px] bg-white px-2 py-0.5 rounded border border-gray-200">
                        {m.type}
                      </span>
                      <span className="truncate max-w-[180px] font-medium text-gray-800">
                        {m.caption || m.url}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: VOCABULARY */}
      {activeTab === "vocabulary" && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-gray-900">
                Mavzuga Biriktirilgan Lug'atlar
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Teoriya o'qib bo'lingach, talabaga ushbu so'zlar kartochka va o'yin ko'rinishida taqdim etiladi.
              </p>
            </div>
            <div className="flex gap-3">
              <Link
                to="/vocabularies"
                target="_blank"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 text-gray-600 hover:bg-gray-50 text-xs font-semibold rounded-xl"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Lug'at Bazasiga O'tish
              </Link>
              <button
                onClick={openVocabModal}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors"
              >
                <Plus className="w-4 h-4" />
                Lug'at Bazasidan Tanlash
              </button>
            </div>
          </div>

          {attachedVocabs.length === 0 ? (
            <div className="p-12 text-center text-gray-400 space-y-2">
              <Layers className="w-10 h-10 mx-auto text-gray-300" />
              <p className="text-sm font-medium text-gray-700">Mavzuga hali lug'at biriktirilmagan</p>
              <p className="text-xs text-gray-400">
                "Lug'at Bazasidan Tanlash" tugmasini bosib, mavzuga tegishli so'zlarni tanlang.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-gray-100 rounded-xl">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase">
                  <tr>
                    <th className="p-3">So'z</th>
                    <th className="p-3">Transkripsiya</th>
                    <th className="p-3">Tarjima</th>
                    <th className="p-3">Turkumi</th>
                    <th className="p-3">Misol</th>
                    <th className="p-3 text-right">O'chirish</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {attachedVocabs.map((v) => (
                    <tr key={v.id} className="hover:bg-gray-50">
                      <td className="p-3 font-bold text-gray-900 flex items-center gap-2">
                        {v.word}
                        <button
                          onClick={() => playAudio(v.word)}
                          className="p-1 text-gray-400 hover:text-indigo-600 rounded"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                      <td className="p-3 font-mono text-xs text-gray-500">{v.phonetic || "—"}</td>
                      <td className="p-3 font-medium text-indigo-950">{v.translation}</td>
                      <td className="p-3 text-xs text-gray-500">{v.partOfSpeech || "noun"}</td>
                      <td className="p-3 text-xs text-gray-500 max-w-xs truncate">
                        {v.exampleSentence || "—"}
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => handleRemoveAttachedVocab(v.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                          title="Mavzudan ajratish"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: QUIZ */}
      {activeTab === "quiz" && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-gray-900">
                Mavzu Testi (Quiz)
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Lug'atdan keyin o'quvchining mavzuni o'zlashtirishini sinovchi test savollari.
              </p>
            </div>
            <button
              onClick={openAddQuizModal}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              Yangi Savol
            </button>
          </div>

          {quizQuestions.length === 0 ? (
            <div className="p-12 text-center text-gray-400 space-y-2">
              <HelpCircle className="w-10 h-10 mx-auto text-gray-300" />
              <p className="text-sm font-medium text-gray-700">Quiz savollari mavjud emas</p>
              <p className="text-xs text-gray-400">
                "+ Yangi Savol" tugmasini bosib, birinchi savolni yarating.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {quizQuestions.map((q, idx) => (
                <div
                  key={q.id}
                  className="p-4 border border-gray-200 rounded-xl bg-gray-50/50 space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2">
                      <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <h4 className="font-semibold text-gray-900 text-sm">{q.question}</h4>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => openEditQuizModal(q)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteQuizQuestion(q.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Options */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pl-8">
                    {q.options.map((opt, oIdx) => (
                      <div
                        key={oIdx}
                        className={`p-2.5 rounded-lg text-xs font-medium border flex items-center justify-between ${
                          q.correctAnswer === oIdx
                            ? "bg-emerald-50 border-emerald-300 text-emerald-900 font-semibold"
                            : "bg-white border-gray-200 text-gray-700"
                        }`}
                      >
                        <span>{opt}</span>
                        {q.correctAnswer === oIdx && (
                          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                        )}
                      </div>
                    ))}
                  </div>

                  {q.explanation && (
                    <div className="pl-8 text-xs text-gray-500 italic">
                      Izoh: {q.explanation}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Media Modal */}
      {showMediaModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-gray-100 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-gray-900">Media Qo'shish</h3>
              <button
                onClick={() => setShowMediaModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Media Turi
                </label>
                <select
                  value={newMedia.type}
                  onChange={(e) => setNewMedia({ ...newMedia, type: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
                >
                  <option value="image">Rasm (Image)</option>
                  <option value="video">Video (YouTube / Direct URL)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  URL Havolasi *
                </label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={newMedia.url}
                  onChange={(e) => setNewMedia({ ...newMedia, url: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Sarlavha yoki Izoh (Caption)
                </label>
                <input
                  type="text"
                  placeholder="Masalan: English Alphabet Chart"
                  value={newMedia.caption}
                  onChange={(e) => setNewMedia({ ...newMedia, caption: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowMediaModal(false)}
                className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-xs font-medium"
              >
                Bekor qilish
              </button>
              <button
                onClick={handleAddMedia}
                className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700"
              >
                Qo'shish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lug'at Bazasidan Tanlash Modali */}
      {showVocabModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl border border-gray-100 overflow-hidden my-8">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-lg text-gray-900">
                  Lug'at Bazasidan Tanlash
                </h3>
                <p className="text-xs text-gray-500">
                  Tanlangan so'zlar ushbu darsga avtomatik biriktiriladi.
                </p>
              </div>
              <button
                onClick={() => setShowVocabModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="So'z yoki tarjimani qidirish..."
                  value={vocabSearch}
                  onChange={(e) => setVocabSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm"
                />
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-gray-100 border border-gray-200 rounded-xl">
                {allVocabularies
                  .filter((v) =>
                    (v.word + " " + v.translation).toLowerCase().includes(vocabSearch.toLowerCase())
                  )
                  .map((v) => {
                    const isSelected = selectedVocabIds.has(v.id);
                    return (
                      <div
                        key={v.id}
                        onClick={() => toggleSelectVocab(v.id)}
                        className={`p-3 flex items-center justify-between cursor-pointer transition-colors ${
                          isSelected ? "bg-indigo-50/70" : "hover:bg-gray-50"
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-gray-900">{v.word}</span>
                            <span className="text-xs font-mono text-gray-500">{v.phonetic}</span>
                            <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 bg-gray-100 rounded text-gray-600">
                              {v.level || "A1"}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 mt-0.5">{v.translation}</p>
                        </div>
                        <div
                          className={`w-5 h-5 rounded-md border flex items-center justify-center ${
                            isSelected
                              ? "bg-indigo-600 border-indigo-600 text-white"
                              : "border-gray-300"
                          }`}
                        >
                          {isSelected && <CheckCircle className="w-3.5 h-3.5" />}
                        </div>
                      </div>
                    );
                  })}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <span className="text-xs text-gray-500">
                  Tanlandi: <strong>{selectedVocabIds.size} ta</strong> so'z
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowVocabModal(false)}
                    className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-xs font-medium"
                  >
                    Bekor qilish
                  </button>
                  <button
                    onClick={handleSaveAttachedVocabs}
                    disabled={savingVocabs}
                    className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {savingVocabs ? "Saqlanmoqda..." : "Mavzuga Biriktirish"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quiz Modal */}
      {showQuizModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-gray-100 p-6 space-y-4 my-8">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg text-gray-900">
                {editingQuestion ? "Savolni tahrirlash" : "Yangi Quiz Savoli"}
              </h3>
              <button
                onClick={() => setShowQuizModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveQuizQuestion} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Savol Matni *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Masalan: Which letter comes after 'C'?"
                  value={quizForm.question}
                  onChange={(e) => setQuizForm({ ...quizForm, question: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-gray-700 uppercase">
                  Variantlar va To'g'ri Javobni belgilang (Radio) *
                </label>
                {quizForm.options.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="correctAnswer"
                      checked={quizForm.correctAnswer === idx}
                      onChange={() => setQuizForm({ ...quizForm, correctAnswer: idx })}
                      className="w-4 h-4 text-indigo-600 cursor-pointer"
                    />
                    <input
                      type="text"
                      required
                      placeholder={`Variant ${idx + 1}`}
                      value={opt}
                      onChange={(e) => {
                        const next = [...quizForm.options];
                        next[idx] = e.target.value;
                        setQuizForm({ ...quizForm, options: next });
                      }}
                      className="flex-1 px-3 py-1.5 border border-gray-200 rounded-xl text-sm"
                    />
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Tushuntirish / Izoh (Ixtiyoriy)
                </label>
                <textarea
                  rows={2}
                  placeholder="Nima uchun bu javob to'g'ri ekanligi haqida qisqa izoh..."
                  value={quizForm.explanation}
                  onChange={(e) => setQuizForm({ ...quizForm, explanation: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowQuizModal(false)}
                  className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-xs font-medium"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={savingQuiz}
                  className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50"
                >
                  {savingQuiz ? "Saqlanmoqda..." : "Saqlash"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
