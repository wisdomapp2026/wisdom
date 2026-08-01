import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronRight as ChevRight, Plus, Edit, Trash2, Filter, Search, FolderPlus, X, GripVertical, Save, Loader2 } from "lucide-react";
import { saveTestToLibrary, getAllTBQuestions, saveTBQuestion, deleteTBQuestion, getAllTBFolders, saveTBFolder, deleteTBFolder, organizeGeneralTestLibrary } from "@shared/repositories";
import type { Test, Question as TQuestion } from "@shared/types";
import CreateQuestionModal from "../components/CreateQuestionModal";
import LatexText from "../components/LatexText";
import { latexPreview } from "../utils/latexPreview";

interface Folder {
  id: string;
  name: string;
  /** Ota papka ID (ierarxiya uchun). null/undefined = ildiz papka */
  parentId?: string | null;
  /** Avtomatik yaratilgan papkalarni aniqlash uchun kalit */
  refKey?: string;
  questionIds: string[];
}

interface Question {
  id: string;
  content: string;
  difficulty: "easy" | "medium" | "hard";
  time: string;
  tags: string[];
  order: number;
  folderId?: string;
  options?: { label: string; text: string; image?: string }[];
  correctAnswer?: string;
  image?: string;
  videoUrl?: string;
  videoType?: "youtube" | "upload";
}

const defaultQuestions: Question[] = [
  { id: "q1", content: "Solve for x: 3x + 12 = 36. Show all intermediate steps.", difficulty: "easy", time: "3 mins", tags: ["Algebra", "Linear Equations"], order: 1 },
  { id: "q2", content: "Determine the area of a right-angled triangle where the base is 5cm and the hypotenuse is 13cm.", difficulty: "medium", time: "5 mins", tags: ["Geometry", "Triangles"], order: 2 },
  { id: "q3", content: "Compare and contrast the distributive property and the associative property.", difficulty: "medium", time: "6 mins", tags: ["Algebra", "Properties"], order: 3 },
  { id: "q4", content: "An airplane flies 400 miles against a wind of 20 mph. Find the speed.", difficulty: "hard", time: "10 mins", tags: ["Word Problems", "Logic"], order: 4 },
  { id: "q5", content: "Simplify: (4x²- 3x + 5) - (2x²+ x - 8).", difficulty: "easy", time: "4 mins", tags: ["Algebra", "Polynomials"], order: 5 },
];

const defaultFolders: Folder[] = [
  { id: "f1", name: "Arifmetika", questionIds: [] },
  { id: "f2", name: "Geometriya", questionIds: [] },
];

const diffColors: Record<string, string> = { easy: "bg-green-100 text-green-700", medium: "bg-yellow-100 text-yellow-700", hard: "bg-red-100 text-red-700" };
const diffLabels: Record<string, string> = { easy: "Oson", medium: "O'rta", hard: "Qiyin" };

// LocalStorage fallback (migratsiya uchun)
function loadState<T>(key: string, fallback: T): T {
  try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : fallback; } catch { return fallback; }
}
function saveState(key: string, val: any) { localStorage.setItem(key, JSON.stringify(val)); }

export default function TestBuilder() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editFolderName, setEditFolderName] = useState("");
  const [draggedIds, setDraggedIds] = useState<string[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<string[]>([]);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  // Firestore dan yuklash
  useEffect(() => {
    loadFromFirestore();
  }, []);

  async function loadFromFirestore() {
    setLoadingData(true);
    try {
      // 1. "Umumiy" va guruhlanmagan savollarni avtomatik Kurs -> Modul -> Mavzu papkalariga ko'chirish
      await organizeGeneralTestLibrary().catch((e) => console.error("Organize err:", e));

      const [dbQuestions, dbFolders] = await Promise.all([
        getAllTBQuestions(),
        getAllTBFolders(),
      ]);

      if (dbQuestions.length > 0 || dbFolders.length > 0) {
        // Firestore dan olish
        setQuestions(dbQuestions as Question[]);
        setFolders(dbFolders as Folder[]);
        setExpandedFolders(dbFolders.map((f: any) => f.id));
      } else {
        // Firestore bo'sh — localStorage dan migratsiya qilish (bir martalik)
        const localQ = loadState<Question[]>("tb_questions", []);
        const localF = loadState<Folder[]>("tb_folders", []);
        if (localQ.length > 0 || localF.length > 0) {
          // Migratsiya: localStorage dan Firestore ga ko'chirish
          for (const q of localQ) await saveTBQuestion(q);
          for (const f of localF) await saveTBFolder(f);
          setQuestions(localQ);
          setFolders(localF);
        }
      }
    } catch (err) {
      console.error("Test builder yuklashda xatolik:", err);
      // Fallback: localStorage dan o'qish
      setQuestions(loadState("tb_questions", []));
      setFolders(loadState("tb_folders", []));
    } finally {
      setLoadingData(false);
    }
  }

  // Firestore + localStorage sync (har bir o'zgarishda)
  useEffect(() => {
    if (loadingData) return; // Birinchi yuklash paytida sync qilmaslik
    saveState("tb_folders", folders);
    saveState("tb_questions", questions);
  }, [folders, questions]);

  const sortedQuestions = [...questions].sort((a, b) => b.order - a.order);

  // Papka ichidagi testga bosganda — explorerda topib highlight qilish
  function scrollToQuestion(id: string) {
    setHighlightedId(id);
    setTimeout(() => {
      const el = document.getElementById(`question-${id}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 100);
    // 3 soniyadan keyin highlight o'chirish
    setTimeout(() => setHighlightedId(null), 3000);
  }

  // Folder toggle
  function toggleFolder(id: string) {
    setExpandedFolders((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  // Folder CRUD
  function addFolder() {
    if (!newFolderName.trim()) return;
    const newFolder = { id: `f-${Date.now()}`, name: newFolderName, parentId: null, questionIds: [] };
    setFolders([...folders, newFolder]);
    saveTBFolder(newFolder); // Firestore
    setNewFolderName("");
    setShowNewFolder(false);
  }
  function deleteFolder(id: string) {
    if (!confirm("Papkani o'chirishga ishonchingiz komilmi?\n\nIchidagi barcha ost-papkalar ham o'chiriladi (savollar saqlanadi).")) return;

    // O'chiriladigan papka va uning barcha bola papkalarini yig'ish
    const toDelete = new Set<string>();
    function collect(fid: string) {
      toDelete.add(fid);
      folders.filter((f) => (f.parentId ?? null) === fid).forEach((c) => collect(c.id));
    }
    collect(id);

    const updatedQuestions = questions.map((q) => (q.folderId && toDelete.has(q.folderId)) ? { ...q, folderId: undefined } : q);
    setQuestions(updatedQuestions);
    setFolders(folders.filter((f) => !toDelete.has(f.id)));

    // Firestore
    toDelete.forEach((fid) => deleteTBFolder(fid));
    updatedQuestions.filter((q) => q.folderId === undefined).forEach((q) => saveTBQuestion(q));
  }
  function saveEditFolder(id: string) {
    const updated = folders.map((f) => f.id === id ? { ...f, name: editFolderName } : f);
    setFolders(updated);
    const folder = updated.find((f) => f.id === id);
    if (folder) saveTBFolder(folder); // Firestore
    setEditingFolderId(null);
  }

  // Selection
  function toggleSelect(id: string) { setSelectedIds((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]); }
  function selectAll() { setSelectedIds(selectedIds.length === questions.length ? [] : questions.map((q) => q.id)); }

  // Delete question
  function deleteQuestion(id: string) {
    if (!confirm("Bu testni o'chirishga ishonchingiz komilmi?")) return;
    setQuestions(questions.filter((q) => q.id !== id));
    setSelectedIds(selectedIds.filter((x) => x !== id));
    setFolders(folders.map((f) => ({ ...f, questionIds: f.questionIds.filter((x) => x !== id) })));
    deleteTBQuestion(id); // Firestore
  }

  // Drop on folder
  function handleDragStart(ids: string[]) { setDraggedIds(ids.length > 0 ? ids : selectedIds); }
  function handleDropOnFolder(folderId: string) {
    const ids = draggedIds.length > 0 ? draggedIds : selectedIds;
    if (ids.length === 0) return;
    const updatedFolders = folders.map((f) => f.id === folderId ? { ...f, questionIds: [...new Set([...f.questionIds, ...ids])] } : f);
    const updatedQuestions = questions.map((q) => ids.includes(q.id) ? { ...q, folderId } : q);
    setFolders(updatedFolders);
    setQuestions(updatedQuestions);
    // Firestore sync
    const folder = updatedFolders.find((f) => f.id === folderId);
    if (folder) saveTBFolder(folder);
    updatedQuestions.filter((q) => ids.includes(q.id)).forEach((q) => saveTBQuestion(q));
    setDraggedIds([]);
    setSelectedIds([]);
  }

  // Get questions in folder
  function getQuestionsInFolder(folderId: string): Question[] {
    return questions.filter((q) => q.folderId === folderId);
  }



  /** Papka va uning barcha bola papkalaridagi savollar soni */
  function countQuestionsDeep(folderId: string): number {
    const direct = questions.filter((q) => q.folderId === folderId).length;
    const children = folders.filter((f) => (f.parentId ?? null) === folderId);
    return direct + children.reduce((sum, c) => sum + countQuestionsDeep(c.id), 0);
  }

  /** Ierarxik papka daraxtini render qilish */
  function renderFolderTree(parentId: string | null, depth: number): React.ReactNode {
    const children = folders.filter((f) => (f.parentId ?? null) === parentId);
    if (children.length === 0) return null;

    return children.map((folder) => {
      const isExpanded = expandedFolders.includes(folder.id);
      const folderQuestions = getQuestionsInFolder(folder.id);
      const subFolders = folders.filter((f) => (f.parentId ?? null) === folder.id);
      const deepCount = countQuestionsDeep(folder.id);
      const hasChildren = subFolders.length > 0 || folderQuestions.length > 0;
      // Chuqurlikka qarab ikonka: 0 = kurs, 1 = modul, 2 = mavzu
      const icon = depth === 0 ? "📚" : depth === 1 ? "📁" : "📄";

      return (
        <div
          key={folder.id}
          className="group"
          style={{ paddingLeft: depth > 0 ? `${depth * 10}px` : undefined }}
          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); e.currentTarget.classList.add("ring-2", "ring-primary-300"); }}
          onDragLeave={(e) => { e.currentTarget.classList.remove("ring-2", "ring-primary-300"); }}
          onDrop={(e) => { e.preventDefault(); e.stopPropagation(); e.currentTarget.classList.remove("ring-2", "ring-primary-300"); handleDropOnFolder(folder.id); }}
        >
          {editingFolderId === folder.id ? (
            <div className="flex items-center gap-1 px-2 py-1">
              <input value={editFolderName} onChange={(e) => setEditFolderName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && saveEditFolder(folder.id)} className="flex-1 text-sm border border-gray-200 rounded px-2 py-0.5 focus:outline-none" autoFocus />
              <button onClick={() => saveEditFolder(folder.id)} className="text-green-500 text-xs font-bold">✓</button>
              <button onClick={() => setEditingFolderId(null)} className="text-gray-400 p-0.5"><X className="w-3.5 h-3.5" /></button>
            </div>
          ) : (
            <>
              <div
                onClick={() => toggleFolder(folder.id)}
                className="flex items-center justify-between px-2 py-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  {hasChildren ? (
                    isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0" /> : <ChevRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  ) : (
                    <span className="w-3.5 shrink-0" />
                  )}
                  <span className="shrink-0">{icon}</span>
                  <span className={`truncate ${depth === 0 ? "text-sm font-semibold text-gray-800" : depth === 1 ? "text-sm font-medium text-gray-700" : "text-[13px] text-gray-600"}`}>
                    {folder.name}
                  </span>
                  <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full min-w-[18px] text-center shrink-0">{deepCount}</span>
                </div>
                <div className="hidden group-hover:flex items-center shrink-0">
                  <button onClick={(e) => { e.stopPropagation(); setEditingFolderId(folder.id); setEditFolderName(folder.name); }} className="text-gray-400 hover:text-primary-500 p-0.5"><Edit className="w-3 h-3" /></button>
                  <button onClick={(e) => { e.stopPropagation(); deleteFolder(folder.id); }} className="text-gray-400 hover:text-red-500 p-0.5"><Trash2 className="w-3 h-3" /></button>
                </div>
              </div>

              {isExpanded && (
                <div className="mt-0.5 space-y-0.5 mb-1">
                  {/* Bola papkalar */}
                  {renderFolderTree(folder.id, depth + 1)}

                  {/* Shu papkadagi savollar */}
                  {folderQuestions.length > 0 && (
                    <div style={{ paddingLeft: `${(depth + 1) * 10 + 14}px` }} className="space-y-0.5">
                      {folderQuestions.map((q) => (
                        <div key={q.id} onClick={(e) => { e.stopPropagation(); scrollToQuestion(q.id); }} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-primary-50 text-xs cursor-pointer transition-colors">
                          <span className="w-1.5 h-1.5 bg-primary-400 rounded-full shrink-0" />
                          <span className="text-gray-600 truncate hover:text-primary-600">
                            {q.content.startsWith("[") || q.content.startsWith("data:") ? "📷 Rasmli savol" : latexPreview(q.content, 32)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Bo'sh papka */}
                  {subFolders.length === 0 && folderQuestions.length === 0 && (
                    <p className="text-[10px] text-gray-400 italic px-2" style={{ paddingLeft: `${(depth + 1) * 10 + 14}px` }}>
                      Bo'sh — testlarni shu yerga tashlang
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      );
    });
  }

  if (loadingData) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
        <span className="ml-3 text-gray-500">Test bazasi yuklanmoqda...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link to="/tests" className="hover:text-primary-500">Testlar</Link>
        <ChevRight className="w-4 h-4" />
        <span className="text-gray-900 font-medium">Test Builder</span>
      </div>

      <div className="flex gap-6">
        {/* Left sidebar - Content Library */}
        <div className="w-60 shrink-0">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase">Content Library</h3>
              <button onClick={() => setShowNewFolder(true)} className="text-primary-500 hover:bg-primary-50 p-1 rounded" title="Papka qo'shish">
                <FolderPlus className="w-4 h-4" />
              </button>
            </div>

            {/* New folder */}
            {showNewFolder && (
              <div className="mb-3 flex items-center gap-1">
                <input value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addFolder()} placeholder="Papka nomi..." className="flex-1 text-sm border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary-500" autoFocus />
                <button onClick={addFolder} className="text-primary-500 p-1"><Plus className="w-3.5 h-3.5" /></button>
                <button onClick={() => setShowNewFolder(false)} className="text-gray-400 p-1"><X className="w-3.5 h-3.5" /></button>
              </div>
            )}

            {/* Folders — ierarxik (Kurs → Modul → Mavzu) */}
            <div className="space-y-1">
              {renderFolderTree(null, 0)}
              {folders.length === 0 && <p className="text-xs text-gray-400 text-center py-4">Papka yo'q</p>}
            </div>

            {selectedIds.length > 0 && (
              <div className="mt-4 p-2 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-[10px] text-blue-700 text-center">{selectedIds.length} ta tanlangan — papkaga sudrab tashlang</p>
              </div>
            )}
          </div>
        </div>

        {/* Center - Question Explorer */}
        <div className="flex-1">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Question Explorer</h2>
              <div className="flex items-center gap-2">
                <button className="btn-outline text-sm flex items-center gap-2"><Filter className="w-4 h-4" />Filters</button>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input placeholder="Qidirish..." className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm w-48" />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 mb-4">
              <button onClick={() => setShowCreateModal(true)} className="btn-primary text-sm flex items-center gap-2"><Plus className="w-4 h-4" />Yangi test savol qo'shish</button>
              <button onClick={selectAll} className="btn-outline text-sm">{selectedIds.length === questions.length ? "Bekor" : "Barchasini belgilash"}</button>
              {selectedIds.length > 0 && (
                <>
                  <span className="text-xs text-gray-500">{selectedIds.length} ta tanlangan</span>
                  <button
                    onClick={() => {
                      if (!confirm(`${selectedIds.length} ta testni o'chirishga ishonchingiz komilmi?`)) return;
                      setQuestions(questions.filter((q) => !selectedIds.includes(q.id)));
                      setFolders(folders.map((f) => ({ ...f, questionIds: f.questionIds.filter((id) => !selectedIds.includes(id)) })));
                      // Firestore dan o'chirish
                      selectedIds.forEach((id) => deleteTBQuestion(id));
                      setSelectedIds([]);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 text-white text-sm font-medium rounded-lg hover:bg-red-600 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    O'chirish ({selectedIds.length})
                  </button>
                </>
              )}
            </div>

            <div className="space-y-3">
              {sortedQuestions.map((q) => (
                <div
                  key={q.id}
                  id={`question-${q.id}`}
                  draggable
                  onDragStart={() => handleDragStart(selectedIds.includes(q.id) ? selectedIds : [q.id])}
                  className={`p-4 border rounded-lg cursor-grab active:cursor-grabbing transition-all ${
                    highlightedId === q.id
                      ? "border-primary-500 bg-primary-100 ring-2 ring-primary-300 animate-pulse"
                      : selectedIds.includes(q.id)
                        ? "border-primary-300 bg-primary-50"
                        : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <GripVertical className="w-4 h-4 text-gray-300 mt-1 shrink-0" />
                    <input type="checkbox" checked={selectedIds.includes(q.id)} onChange={() => toggleSelect(q.id)} className="mt-1 w-4 h-4 text-primary-500 rounded shrink-0" />
                    <div className="flex-1 min-w-0">
                        <>
                          <div className="text-sm text-gray-900 break-words">
                            {q.content.startsWith("[IMAGES:") || q.content.startsWith("data:")
                              ? "📷 Rasmli savol"
                              : <LatexText text={q.content} />}
                          </div>

                          {/* Javob variantlari — LaTeX render bilan */}
                          {q.options && q.options.some((o) => o.text?.trim()) && (
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2">
                              {q.options.filter((o) => o.text?.trim()).map((o) => (
                                <div key={o.label} className="flex items-start gap-1.5 text-xs">
                                  <span className={`shrink-0 font-semibold ${q.correctAnswer === o.label ? "text-green-600" : "text-gray-400"}`}>
                                    {o.label})
                                  </span>
                                  <span className={q.correctAnswer === o.label ? "text-green-700 font-medium" : "text-gray-600"}>
                                    <LatexText text={o.text} />
                                  </span>
                                  {q.correctAnswer === o.label && <span className="text-green-600 shrink-0">✓</span>}
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="flex items-center gap-3 mt-2">
                            <span className="text-xs text-gray-500">⏱ {q.time}</span>
                            {q.tags.map((tag) => <span key={tag} className="text-xs text-gray-500">#{tag}</span>)}
                            {q.folderId && <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">📁 {folders.find((f) => f.id === q.folderId)?.name}</span>}
                          </div>
                        </>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${diffColors[q.difficulty]}`}>{diffLabels[q.difficulty]}</span>
                    <div className="flex items-center gap-1 shrink-0 ml-1">
                      <button onClick={() => setEditingQuestion(q)} className="p-1.5 text-gray-400 hover:text-primary-500 rounded hover:bg-gray-50"><Edit className="w-3.5 h-3.5" /></button>
                      <button onClick={() => deleteQuestion(q.id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded hover:bg-red-50"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-center text-sm text-gray-400 mt-4">{questions.length} ta savol mavjud</p>

            {/* Saqlash tugmasi */}
            {questions.length > 0 && (
              <div className="mt-6 pt-4 border-t border-gray-100 flex justify-center">
                <button
                  onClick={async () => {
                    setSaving(true);
                    try {
                      const testId = `test-${Date.now()}`;
                      const testQuestions: TQuestion[] = questions.map((q, idx) => ({
                        id: `${testId}-q${idx + 1}`,
                        type: "multiple_choice" as const,
                        content: q.content,
                        options: q.options || [
                          { label: "A", text: "" },
                          { label: "B", text: "" },
                          { label: "C", text: "" },
                          { label: "D", text: "" },
                        ],
                        correctAnswer: q.correctAnswer || "A",
                        points: 1,
                        estimatedMinutes: parseInt(q.time) || 3,
                        difficulty: q.difficulty,
                        tags: q.tags,
                      }));

                      const totalTime = testQuestions.reduce((sum, q) => sum + q.estimatedMinutes, 0);

                      const test: Test = {
                        id: testId,
                        courseId: "",
                        title: `Test — ${questions.length} savol`,
                        description: `${questions.length} ta savol · ${totalTime} daqiqa`,
                        version: "Published",
                        status: "published",
                        passingScore: Math.ceil(questions.length * 0.6),
                        shuffleQuestions: false,
                        totalPoints: questions.length,
                        totalTime,
                        questions: testQuestions,
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                        createdBy: "admin",
                      };

                      await saveTestToLibrary(test);
                      alert("Saqlandi ✓");
                    } catch (err) {
                      console.error("Saqlashda xatolik:", err);
                      alert("Xatolik yuz berdi!");
                    } finally {
                      setSaving(false);
                    }
                  }}
                  disabled={saving}
                  className="btn-primary flex items-center gap-2 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {saving ? "Saqlanmoqda..." : "Saqlash"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Question Modal */}
      <CreateQuestionModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSave={(q) => {
          const newId = `q-${Date.now()}`;
          const newOrder = questions.length > 0 ? Math.max(...questions.map((x) => x.order)) + 1 : 1;
          const newQuestion: Question = { id: newId, content: q.content, difficulty: q.difficulty, time: q.time, tags: q.tags, order: newOrder, folderId: undefined, options: q.options, correctAnswer: q.correctAnswer, image: q.image, videoUrl: q.videoUrl, videoType: q.videoType };
          setQuestions([...questions, newQuestion]);
          saveTBQuestion(newQuestion); // Firestore
        }}
      />

      {/* Edit Question Modal */}
      <CreateQuestionModal
        open={!!editingQuestion}
        onClose={() => setEditingQuestion(null)}
        initialData={editingQuestion ? {
          content: editingQuestion.content,
          difficulty: editingQuestion.difficulty,
          time: editingQuestion.time,
          tags: editingQuestion.tags,
          options: editingQuestion.options || [],
          correctAnswer: editingQuestion.correctAnswer || "A",
          image: editingQuestion.image,
          videoUrl: editingQuestion.videoUrl,
          videoType: editingQuestion.videoType,
        } : null}
        onSave={(q) => {
          if (!editingQuestion) return;
          const updated = questions.map((x) => x.id === editingQuestion.id ? {
            ...x,
            content: q.content,
            difficulty: q.difficulty,
            time: q.time,
            tags: q.tags,
            options: q.options,
            correctAnswer: q.correctAnswer,
            image: q.image,
            videoUrl: q.videoUrl,
            videoType: q.videoType,
          } : x);
          setQuestions(updated);
          const updatedQ = updated.find((x) => x.id === editingQuestion.id);
          if (updatedQ) saveTBQuestion(updatedQ); // Firestore
          setEditingQuestion(null);
        }}
      />
    </div>
  );
}
