import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, FileText, Clock, Loader2, Edit, Trash2, Eye, List, Globe, GlobeLock, ChevronDown, ChevronRight, GripVertical, X, CheckSquare, Square } from "lucide-react";
import { getAllCourses, getTestsByCourse, deleteTest, updateTest, getAllTestLists, createTestList, updateTestList, deleteTestList } from "@shared/repositories";
import type { Course, Test, TestList } from "@shared/types";
import CreateTestListModal from "../components/CreateTestListModal";

interface TestWithCourse extends Test {
  courseName: string;
}

export default function Tests() {
  const [testLists, setTestLists] = useState<TestList[]>([]);
  const [allTests, setAllTests] = useState<TestWithCourse[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateListModal, setShowCreateListModal] = useState(false);

  // Expanded test lists (ichini ko'rsatish)
  const [expandedLists, setExpandedLists] = useState<Set<string>>(new Set());

  // Preview
  const [previewTest, setPreviewTest] = useState<TestWithCourse | null>(null);

  // Test listga savol qo'shish
  const [addToListId, setAddToListId] = useState<string | null>(null);

  // Drag and drop (test list ichidagi testlar tartibi)
  const [dragListId, setDragListId] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [coursesData, listsData] = await Promise.all([
        getAllCourses(),
        getAllTestLists(),
      ]);
      setCourses(coursesData);
      setTestLists(listsData);

      const tests: TestWithCourse[] = [];
      for (const course of coursesData) {
        const courseTests = await getTestsByCourse(course.id);
        for (const t of courseTests) {
          tests.push({ ...t, courseName: course.title });
        }
      }
      setAllTests(tests);
    } catch (err) {
      console.error("Testlarni yuklashda xatolik:", err);
    } finally {
      setLoading(false);
    }
  }

  function toggleExpandList(listId: string) {
    setExpandedLists((prev) => {
      const next = new Set(prev);
      if (next.has(listId)) next.delete(listId);
      else next.add(listId);
      return next;
    });
  }

  // Test listni delete
  async function handleDeleteTestList(list: TestList) {
    if (!confirm(`"${list.title}" test listni o'chirishga ishonchingiz komilmi?`)) return;
    try {
      await deleteTestList(list.id);
      setTestLists((prev) => prev.filter((l) => l.id !== list.id));
    } catch (err) {
      console.error("Test list o'chirishda xatolik:", err);
    }
  }

  // Test list holatini o'zgartirish
  async function handleToggleStatus(list: TestList) {
    const newStatus = list.status === "published" ? "draft" : "published";
    try {
      await updateTestList(list.id, { status: newStatus });
      setTestLists((prev) => prev.map((l) => l.id === list.id ? { ...l, status: newStatus } : l));
    } catch (err) {
      console.error("Holat o'zgartirishda xatolik:", err);
    }
  }

  // Test list ichidan test o'chirish
  async function handleRemoveTestFromList(listId: string, testId: string) {
    const list = testLists.find((l) => l.id === listId);
    if (!list) return;
    const newIds = list.testIds.filter((id) => id !== testId);
    try {
      await updateTestList(listId, { testIds: newIds });
      setTestLists((prev) => prev.map((l) => l.id === listId ? { ...l, testIds: newIds } : l));
    } catch (err) {
      console.error("Test o'chirishda xatolik:", err);
    }
  }

  // Drag and drop — test list ichida tartib o'zgartirish
  function handleDragStart(listId: string, index: number) {
    setDragListId(listId);
    setDragIndex(index);
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    setDragOverIndex(index);
  }

  function handleDragLeave() {
    setDragOverIndex(null);
  }

  async function handleDrop(listId: string, index: number) {
    if (dragListId !== listId || dragIndex === null || dragIndex === index) {
      setDragIndex(null);
      setDragOverIndex(null);
      setDragListId(null);
      return;
    }

    const list = testLists.find((l) => l.id === listId);
    if (!list) return;

    const newIds = [...list.testIds];
    const [moved] = newIds.splice(dragIndex, 1);
    newIds.splice(index, 0, moved);

    try {
      await updateTestList(listId, { testIds: newIds });
      setTestLists((prev) => prev.map((l) => l.id === listId ? { ...l, testIds: newIds } : l));
    } catch (err) {
      console.error("Tartib o'zgartirishda xatolik:", err);
    }

    setDragIndex(null);
    setDragOverIndex(null);
    setDragListId(null);
  }

  // Test list nomini inline edit qilish
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [editListTitle, setEditListTitle] = useState("");

  async function handleSaveListTitle(listId: string) {
    if (!editListTitle.trim()) return;
    try {
      await updateTestList(listId, { title: editListTitle.trim() });
      setTestLists((prev) => prev.map((l) => l.id === listId ? { ...l, title: editListTitle.trim() } : l));
      setEditingListId(null);
    } catch (err) {
      console.error("Nom o'zgartirishda xatolik:", err);
    }
  }

  // Content Library dan savol ma'lumotlarini olish
  function getQuestionContent(testId: string): { content: string; difficulty: string; time: string } | null {
    try {
      const questions = JSON.parse(localStorage.getItem("tb_questions") || "[]");
      const q = questions.find((q: any) => q.id === testId);
      if (q) return { content: q.content, difficulty: q.difficulty, time: q.time };
    } catch {}
    return null;
  }

  const filteredTestLists = testLists.filter(
    (l) => l.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Testlar</h1>
          <p className="text-sm text-gray-500 mt-1">
            Barcha testlarni boshqaring ({testLists.length} ta test list)
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCreateListModal(true)}
            className="btn-outline flex items-center gap-2"
          >
            <List className="w-4 h-4" />
            Test list yaratish
          </button>
          <Link to="/tests/builder" className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Test bazasi
          </Link>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Test listlarni qidirish..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
        </div>
      )}

      {/* Test Lists */}
      {!loading && (
        <div className="space-y-4">
          {filteredTestLists.length === 0 && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
              <p className="text-4xl mb-3">📋</p>
              <p className="text-gray-500 mb-4">Hali test list yaratilmagan</p>
              <button
                onClick={() => setShowCreateListModal(true)}
                className="btn-primary inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Birinchi test list yaratish
              </button>
            </div>
          )}

          {filteredTestLists.map((list) => {
            const isExpanded = expandedLists.has(list.id);
            const isEditing = editingListId === list.id;

            return (
              <div key={list.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                {/* List header */}
                <div className="flex items-center justify-between p-5">
                  <div className="flex items-center gap-4 flex-1 min-w-0 cursor-pointer" onClick={() => toggleExpandList(list.id)}>
                    <div className="flex items-center gap-2">
                      {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                      <div className="w-11 h-11 bg-orange-50 rounded-xl flex items-center justify-center">
                        <List className="w-5 h-5 text-orange-500" />
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      {isEditing ? (
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <input
                            value={editListTitle}
                            onChange={(e) => setEditListTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveListTitle(list.id);
                              if (e.key === "Escape") setEditingListId(null);
                            }}
                            className="px-2 py-1 border border-primary-300 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary-500"
                            autoFocus
                          />
                          <button onClick={() => handleSaveListTitle(list.id)} className="text-green-600 text-sm font-bold">✓</button>
                          <button onClick={() => setEditingListId(null)} className="text-gray-400 text-sm">✕</button>
                        </div>
                      ) : (
                        <>
                          <h3 className="font-semibold text-gray-900">{list.title}</h3>
                          <p className="text-xs text-gray-500 mt-0.5">📝 {list.testIds.length} ta savol</p>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    {/* Published toggle */}
                    <button
                      onClick={() => handleToggleStatus(list)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        list.status === "published"
                          ? "border-green-200 text-green-700 bg-green-50 hover:bg-green-100"
                          : "border-gray-200 text-gray-600 bg-gray-50 hover:bg-gray-100"
                      }`}
                      title={list.status === "published" ? "Student appda ko'rinmoqda" : "Yashirin"}
                    >
                      {list.status === "published" ? (
                        <><Globe className="w-3.5 h-3.5" /> Published</>
                      ) : (
                        <><GlobeLock className="w-3.5 h-3.5" /> Draft</>
                      )}
                    </button>
                    {/* Edit */}
                    <button
                      onClick={() => { setEditingListId(list.id); setEditListTitle(list.title); }}
                      className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg"
                      title="Tahrirlash"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    {/* Delete */}
                    <button
                      onClick={() => handleDeleteTestList(list)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                      title="O'chirish"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Expanded — test list ichidagi savollar */}
                {isExpanded && (
                  <div className="border-t border-gray-100">
                    {list.testIds.length === 0 && (
                      <div className="text-center py-8 text-gray-400 text-sm">
                        Bu test listda hali savol yo'q
                      </div>
                    )}
                    <div className="divide-y divide-gray-50">
                      {list.testIds.map((testId, idx) => {
                        const questionData = getQuestionContent(testId);
                        return (
                          <div
                            key={testId}
                            draggable
                            onDragStart={() => handleDragStart(list.id, idx)}
                            onDragOver={(e) => handleDragOver(e, idx)}
                            onDragLeave={handleDragLeave}
                            onDrop={() => handleDrop(list.id, idx)}
                            className={`flex items-center gap-3 px-5 py-3 transition-all cursor-grab active:cursor-grabbing ${
                              dragListId === list.id && dragOverIndex === idx ? "bg-primary-50 border-l-4 border-l-primary-400" : "hover:bg-gray-50"
                            } ${dragListId === list.id && dragIndex === idx ? "opacity-40" : ""}`}
                          >
                            <GripVertical className="w-4 h-4 text-gray-300 flex-shrink-0" />
                            <div className="w-7 h-7 bg-gray-100 rounded-lg flex items-center justify-center text-xs font-bold text-gray-500 flex-shrink-0">
                              {idx + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              {questionData ? (
                                <>
                                  <p className="text-sm text-gray-900 truncate">
                                    {questionData.content.startsWith("[IMAGES:") || questionData.content.startsWith("data:")
                                      ? "📷 Rasmli savol"
                                      : questionData.content}
                                  </p>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                                      questionData.difficulty === "easy" ? "bg-green-100 text-green-700" :
                                      questionData.difficulty === "medium" ? "bg-yellow-100 text-yellow-700" :
                                      "bg-red-100 text-red-700"
                                    }`}>
                                      {questionData.difficulty === "easy" ? "Oson" : questionData.difficulty === "medium" ? "O'rta" : "Qiyin"}
                                    </span>
                                    <span className="text-[10px] text-gray-400">⏱ {questionData.time}</span>
                                  </div>
                                </>
                              ) : (
                                <p className="text-sm text-gray-400 italic">Savol topilmadi (ID: {testId.slice(0, 12)}...)</p>
                              )}
                            </div>
                            {/* Preview */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (questionData) {
                                  setPreviewTest({ id: testId, title: questionData.content, courseName: "", courseId: "", description: "", version: "", status: "published", passingScore: 0, shuffleQuestions: false, totalPoints: 0, totalTime: 0, questions: [], createdAt: 0, updatedAt: 0, createdBy: "" } as TestWithCourse);
                                }
                              }}
                              className="p-1.5 text-gray-400 hover:text-primary-500 hover:bg-primary-50 rounded"
                              title="Ko'rish"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {/* Delete from list */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveTestFromList(list.id, testId);
                              }}
                              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                              title="Listdan o'chirish"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                    {/* Savol qo'shish tugmasi */}
                    <div className="p-3 border-t border-gray-100">
                      <button
                        onClick={() => setAddToListId(list.id)}
                        className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-primary-600 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        Savol qo'shish
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Preview Modal */}
      {previewTest && (
        <PreviewModal
          testId={previewTest.id}
          onClose={() => setPreviewTest(null)}
        />
      )}

      {/* Create Test List Modal */}
      <CreateTestListModal
        open={showCreateListModal}
        onClose={() => setShowCreateListModal(false)}
        onCreated={loadData}
      />

      {/* Add questions to existing test list */}
      {addToListId && (
        <AddToListModal
          listId={addToListId}
          existingIds={testLists.find((l) => l.id === addToListId)?.testIds || []}
          onClose={() => setAddToListId(null)}
          onAdded={async (newIds) => {
            const list = testLists.find((l) => l.id === addToListId);
            if (!list) return;
            const updatedIds = [...list.testIds, ...newIds];
            await updateTestList(addToListId, { testIds: updatedIds });
            setTestLists((prev) => prev.map((l) => l.id === addToListId ? { ...l, testIds: updatedIds } : l));
            setAddToListId(null);
          }}
        />
      )}
    </div>
  );
}

// ===== Preview Modal =====
function PreviewModal({ testId, onClose }: { testId: string; onClose: () => void }) {
  const [question, setQuestion] = useState<any>(null);

  useEffect(() => {
    try {
      const questions = JSON.parse(localStorage.getItem("tb_questions") || "[]");
      const q = questions.find((q: any) => q.id === testId);
      setQuestion(q || null);
    } catch {
      setQuestion(null);
    }
  }, [testId]);

  const diffColors: Record<string, string> = { easy: "bg-green-100 text-green-700", medium: "bg-yellow-100 text-yellow-700", hard: "bg-red-100 text-red-700" };
  const diffLabels: Record<string, string> = { easy: "Oson", medium: "O'rta", hard: "Qiyin" };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">Savol Preview</h3>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {question ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-900 font-medium">
              {question.content.startsWith("[IMAGES:") || question.content.startsWith("data:")
                ? "📷 Rasmli savol"
                : question.content}
            </p>

            {question.options && question.options.length > 0 && (
              <div className="space-y-2">
                {question.options.map((opt: any) => (
                  <div
                    key={opt.label}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg border text-sm ${
                      question.correctAnswer === opt.label
                        ? "border-green-300 bg-green-50 text-green-800"
                        : "border-gray-200 text-gray-700"
                    }`}
                  >
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      question.correctAnswer === opt.label ? "bg-green-500 text-white" : "bg-gray-100 text-gray-500"
                    }`}>
                      {opt.label}
                    </span>
                    <span>{opt.text || "(kiritilmagan)"}</span>
                    {question.correctAnswer === opt.label && (
                      <span className="ml-auto text-xs text-green-600 font-medium">✓ To'g'ri</span>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-3 text-xs text-gray-500 pt-2 border-t border-gray-100">
              <span className={`px-2 py-0.5 rounded-full ${diffColors[question.difficulty] || ""}`}>
                {diffLabels[question.difficulty] || question.difficulty}
              </span>
              <span>⏱ {question.time}</span>
              {question.tags?.map((tag: string) => (
                <span key={tag} className="bg-gray-100 px-1.5 py-0.5 rounded">#{tag}</span>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-gray-400 text-center py-8">Savol topilmadi</p>
        )}

        <div className="mt-6 flex justify-end">
          <button onClick={onClose} className="btn-outline">Yopish</button>
        </div>
      </div>
    </div>
  );
}

// ===== Add To List Modal — Content Library dan savol qo'shish =====
function AddToListModal({ listId, existingIds, onClose, onAdded }: {
  listId: string;
  existingIds: string[];
  onClose: () => void;
  onAdded: (newIds: string[]) => void;
}) {
  interface LibQuestion { id: string; content: string; difficulty: string; time: string; tags: string[]; folderId?: string; options?: any[]; correctAnswer?: string; }
  interface LibFolder { id: string; name: string; }

  const [folders, setFolders] = useState<LibFolder[]>([]);
  const [questions, setQuestions] = useState<LibQuestion[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const f = JSON.parse(localStorage.getItem("tb_folders") || "[]");
    const q = JSON.parse(localStorage.getItem("tb_questions") || "[]");
    setFolders(f);
    setQuestions(q);
    setExpandedFolders(new Set(f.map((fo: any) => fo.id)));
  }, []);

  function toggleFolder(folderId: string) {
    setExpandedFolders((prev) => { const n = new Set(prev); if (n.has(folderId)) n.delete(folderId); else n.add(folderId); return n; });
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }

  const matchesSearch = (q: LibQuestion) => {
    if (!searchQuery.trim()) return true;
    return q.content.toLowerCase().includes(searchQuery.toLowerCase()) || q.tags?.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
  };

  function getQuestionsInFolder(folderId: string) { return questions.filter((q) => q.folderId === folderId); }
  function getUncategorized() { return questions.filter((q) => !q.folderId); }

  const diffColors: Record<string, string> = { easy: "bg-green-100 text-green-700", medium: "bg-yellow-100 text-yellow-700", hard: "bg-red-100 text-red-700" };
  const diffLabels: Record<string, string> = { easy: "Oson", medium: "O'rta", hard: "Qiyin" };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Savol qo'shish</h2>
            <p className="text-sm text-gray-500">Content Library dan savollarni tanlang</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="px-6 pt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Qidirish..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {folders.map((folder) => {
            const fq = getQuestionsInFolder(folder.id).filter(matchesSearch);
            const isExp = expandedFolders.has(folder.id);
            return (
              <div key={folder.id} className="border border-gray-100 rounded-xl overflow-hidden">
                <div className="flex items-center gap-3 p-3 bg-gray-50 cursor-pointer hover:bg-gray-100" onClick={() => toggleFolder(folder.id)}>
                  {isExp ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                  <span>📁</span>
                  <span className="font-medium text-gray-700 text-sm">{folder.name}</span>
                  <span className="text-[10px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full">{fq.length}</span>
                </div>
                {isExp && (
                  <div className="divide-y divide-gray-50">
                    {fq.length === 0 && <p className="text-xs text-gray-400 text-center py-3 italic">Bo'sh</p>}
                    {fq.map((q) => {
                      const alreadyAdded = existingIds.includes(q.id);
                      const isSelected = selectedIds.has(q.id);
                      return (
                        <div key={q.id} onClick={() => !alreadyAdded && toggleSelect(q.id)} className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${alreadyAdded ? "opacity-40 cursor-not-allowed" : isSelected ? "bg-primary-50" : "hover:bg-gray-50"}`}>
                          <div className="flex-shrink-0">
                            {alreadyAdded ? <CheckSquare className="w-5 h-5 text-gray-300" /> : isSelected ? <CheckSquare className="w-5 h-5 text-primary-500" /> : <Square className="w-5 h-5 text-gray-300" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-900 truncate">{q.content.startsWith("[") || q.content.startsWith("data:") ? "📷 Rasmli savol" : q.content}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${diffColors[q.difficulty] || ""}`}>{diffLabels[q.difficulty] || q.difficulty}</span>
                              <span className="text-[10px] text-gray-400">⏱ {q.time}</span>
                              {alreadyAdded && <span className="text-[10px] text-gray-400">(allaqachon qo'shilgan)</span>}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {(() => {
            const unc = getUncategorized().filter(matchesSearch);
            if (unc.length === 0) return null;
            return (
              <div className="border border-gray-100 rounded-xl overflow-hidden">
                <div className="flex items-center gap-3 p-3 bg-gray-50">
                  <span>📋</span><span className="font-medium text-gray-700 text-sm">Boshqa savollar</span>
                  <span className="text-[10px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full">{unc.length}</span>
                </div>
                <div className="divide-y divide-gray-50">
                  {unc.map((q) => {
                    const alreadyAdded = existingIds.includes(q.id);
                    const isSelected = selectedIds.has(q.id);
                    return (
                      <div key={q.id} onClick={() => !alreadyAdded && toggleSelect(q.id)} className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${alreadyAdded ? "opacity-40 cursor-not-allowed" : isSelected ? "bg-primary-50" : "hover:bg-gray-50"}`}>
                        <div className="flex-shrink-0">
                          {alreadyAdded ? <CheckSquare className="w-5 h-5 text-gray-300" /> : isSelected ? <CheckSquare className="w-5 h-5 text-primary-500" /> : <Square className="w-5 h-5 text-gray-300" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900 truncate">{q.content.startsWith("[") || q.content.startsWith("data:") ? "📷 Rasmli savol" : q.content}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${diffColors[q.difficulty] || ""}`}>{diffLabels[q.difficulty] || q.difficulty}</span>
                            <span className="text-[10px] text-gray-400">⏱ {q.time}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>

        <div className="p-6 border-t border-gray-100 flex items-center justify-between">
          <span className="text-sm text-gray-500">{selectedIds.size > 0 ? `${selectedIds.size} ta savol tanlandi` : "Savol tanlanmagan"}</span>
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="btn-outline">Bekor qilish</button>
            <button onClick={() => onAdded(Array.from(selectedIds))} disabled={selectedIds.size === 0} className="btn-primary disabled:opacity-50">
              Qo'shish ({selectedIds.size})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
