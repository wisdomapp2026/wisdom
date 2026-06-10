import { useState, useEffect } from "react";
import { X, Search, ChevronDown, ChevronRight, CheckSquare, Square, Eye, EyeOff, List } from "lucide-react";
import { createTest, getAllTestLists } from "@shared/repositories";
import type { Test, Question as TQuestion, TestList } from "@shared/types";

/** Content Library dagi savol formati */
interface LibQuestion {
  id: string;
  content: string;
  difficulty: "easy" | "medium" | "hard";
  time: string;
  tags: string[];
  order: number;
  folderId?: string;
  options?: { label: string; text: string }[];
  correctAnswer?: string;
}

interface LibFolder {
  id: string;
  name: string;
  questionIds: string[];
}

interface Props {
  open: boolean;
  courseId: string;
  existingTestIds: string[];
  onClose: () => void;
  onImported: () => void;
}

const diffColors: Record<string, string> = { easy: "bg-green-100 text-green-700", medium: "bg-yellow-100 text-yellow-700", hard: "bg-red-100 text-red-700" };
const diffLabels: Record<string, string> = { easy: "Oson", medium: "O'rta", hard: "Qiyin" };

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const s = localStorage.getItem(key);
    return s ? JSON.parse(s) : fallback;
  } catch {
    return fallback;
  }
}

export default function ImportTestModal({ open, courseId, existingTestIds, onClose, onImported }: Props) {
  const [activeTab, setActiveTab] = useState<"library" | "testlists">("library");

  // Content Library
  const [folders, setFolders] = useState<LibFolder[]>([]);
  const [questions, setQuestions] = useState<LibQuestion[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [testTitle, setTestTitle] = useState("");
  const [testTime, setTestTime] = useState(20);

  // Test Lists
  const [testLists, setTestLists] = useState<TestList[]>([]);
  const [selectedListIds, setSelectedListIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open) {
      const f = loadFromStorage<LibFolder[]>("tb_folders", []);
      const q = loadFromStorage<LibQuestion[]>("tb_questions", []);
      setFolders(f);
      setQuestions(q);
      setSelectedIds(new Set());
      setSelectedListIds(new Set());
      setSearchQuery("");
      setPreviewId(null);
      setTestTitle("");
      setTestTime(20);
      setExpandedFolders(new Set(f.map((fo) => fo.id)));
      setActiveTab("library");

      // Test listlarni yuklash
      getAllTestLists().then(setTestLists).catch(console.error);
    }
  }, [open]);

  if (!open) return null;

  function toggleFolder(folderId: string) {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });
  }

  function toggleSelect(qId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(qId)) next.delete(qId);
      else next.add(qId);
      return next;
    });
  }

  function toggleSelectAll(folderQuestions: LibQuestion[]) {
    const allSelected = folderQuestions.every((q) => selectedIds.has(q.id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const q of folderQuestions) {
        if (allSelected) next.delete(q.id);
        else next.add(q.id);
      }
      return next;
    });
  }

  function toggleListSelect(listId: string) {
    setSelectedListIds((prev) => {
      const next = new Set(prev);
      if (next.has(listId)) next.delete(listId);
      else next.add(listId);
      return next;
    });
  }

  function getQuestionsInFolder(folderId: string): LibQuestion[] {
    return questions.filter((q) => q.folderId === folderId);
  }

  function getUncategorizedQuestions(): LibQuestion[] {
    return questions.filter((q) => !q.folderId);
  }

  const matchesSearch = (q: LibQuestion) => {
    if (!searchQuery.trim()) return true;
    const s = searchQuery.toLowerCase();
    return q.content.toLowerCase().includes(s) || q.tags.some((t) => t.toLowerCase().includes(s));
  };

  async function handleImportFromLibrary() {
    if (selectedIds.size === 0) return;
    const title = testTitle.trim() || `Test — ${selectedIds.size} savol`;
    setImporting(true);
    try {
      const testId = `test-${Date.now()}`;
      const selectedQuestions = questions.filter((q) => selectedIds.has(q.id));

      const testQuestions: TQuestion[] = selectedQuestions.map((q, idx) => ({
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

      const test: Test = {
        id: testId,
        courseId,
        title,
        description: `${selectedQuestions.length} ta savol · ${testTime} daqiqa`,
        version: "Published",
        status: "published",
        passingScore: Math.ceil(selectedQuestions.length * 0.6),
        shuffleQuestions: false,
        totalPoints: selectedQuestions.length,
        totalTime: testTime,
        questions: testQuestions,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        createdBy: "admin",
      };

      await createTest(courseId, test);
      onImported();
      onClose();
    } catch (err) {
      console.error("Test import qilishda xatolik:", err);
    } finally {
      setImporting(false);
    }
  }

  async function handleImportFromTestLists() {
    if (selectedListIds.size === 0) return;
    setImporting(true);
    try {
      for (const listId of selectedListIds) {
        const list = testLists.find((l) => l.id === listId);
        if (!list) continue;

        // Test list dagi savollarni topib, test yaratish
        const listQuestions = questions.filter((q) => list.testIds.includes(q.id));
        if (listQuestions.length === 0) continue;

        const testId = `test-${Date.now()}-${listId}`;
        const testQuestions: TQuestion[] = listQuestions.map((q, idx) => ({
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

        const listTotalTime = testQuestions.reduce((sum, q) => sum + q.estimatedMinutes, 0);
        const test: Test = {
          id: testId,
          courseId,
          title: list.title,
          description: `${listQuestions.length} ta savol · ${listTotalTime} daqiqa`,
          version: "Published",
          status: "published",
          passingScore: Math.ceil(listQuestions.length * 0.6),
          shuffleQuestions: false,
          totalPoints: listQuestions.length,
          totalTime: listTotalTime,
          questions: testQuestions,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          createdBy: "admin",
        };

        await createTest(courseId, test);
      }
      onImported();
      onClose();
    } catch (err) {
      console.error("Test list import qilishda xatolik:", err);
    } finally {
      setImporting(false);
    }
  }

  const previewQuestion = previewId ? questions.find((q) => q.id === previewId) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl w-full max-w-3xl shadow-xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Test qo'shish</h2>
            <p className="text-sm text-gray-500 mt-0.5">Content Library yoki Test Listlardan tanlang</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-6 pt-4">
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg w-fit">
            <button
              onClick={() => setActiveTab("library")}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === "library" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
            >
              Content Library
            </button>
            <button
              onClick={() => setActiveTab("testlists")}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === "testlists" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
            >
              Test Listlar ({testLists.length})
            </button>
          </div>
        </div>

        {/* Content Library Tab */}
        {activeTab === "library" && (
          <>
            {/* Search + settings */}
            <div className="px-6 pt-3">
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Savollarni qidirish..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <input
                  type="text"
                  placeholder="Test nomi (ixtiyoriy)"
                  value={testTitle}
                  onChange={(e) => setTestTitle(e.target.value)}
                  className="w-44 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={testTime}
                    onChange={(e) => setTestTime(Number(e.target.value))}
                    min={1}
                    className="w-16 px-2 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-center"
                  />
                  <span className="text-xs text-gray-400">daq</span>
                </div>
              </div>
            </div>

            {/* Questions */}
            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {questions.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-4xl mb-3">📝</p>
                  <p className="text-gray-500">Content Library bo'sh. Avval Test Builder da savollar yarating.</p>
                </div>
              )}

              {folders.map((folder) => {
                const folderQuestions = getQuestionsInFolder(folder.id).filter(matchesSearch);
                const isExpanded = expandedFolders.has(folder.id);
                const allSelected = folderQuestions.length > 0 && folderQuestions.every((q) => selectedIds.has(q.id));

                return (
                  <div key={folder.id} className="border border-gray-100 rounded-xl overflow-hidden">
                    <div className="flex items-center gap-3 p-3 bg-gray-50 cursor-pointer hover:bg-gray-100" onClick={() => toggleFolder(folder.id)}>
                      {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                      <span>📁</span>
                      <span className="font-medium text-gray-700 text-sm">{folder.name}</span>
                      <span className="text-[10px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full">{folderQuestions.length}</span>
                      {folderQuestions.length > 0 && (
                        <button onClick={(e) => { e.stopPropagation(); toggleSelectAll(folderQuestions); }} className={`ml-auto text-xs px-2 py-1 rounded ${allSelected ? "bg-primary-100 text-primary-700" : "bg-white text-gray-500 border border-gray-200"}`}>
                          {allSelected ? "Bekor" : "Barchasini"}
                        </button>
                      )}
                    </div>
                    {isExpanded && (
                      <div className="divide-y divide-gray-50">
                        {folderQuestions.length === 0 && <p className="text-xs text-gray-400 text-center py-3 italic">Bo'sh</p>}
                        {folderQuestions.map((q) => (
                          <QuestionRow key={q.id} question={q} isSelected={selectedIds.has(q.id)} isPreview={previewId === q.id} onToggle={() => toggleSelect(q.id)} onPreview={() => setPreviewId(previewId === q.id ? null : q.id)} />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {(() => {
                const uncategorized = getUncategorizedQuestions().filter(matchesSearch);
                if (uncategorized.length === 0) return null;
                return (
                  <div className="border border-gray-100 rounded-xl overflow-hidden">
                    <div className="flex items-center gap-3 p-3 bg-gray-50">
                      <span>📋</span>
                      <span className="font-medium text-gray-700 text-sm">Boshqa savollar</span>
                      <span className="text-[10px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full">{uncategorized.length}</span>
                      <button onClick={() => toggleSelectAll(uncategorized)} className={`ml-auto text-xs px-2 py-1 rounded ${uncategorized.every((q) => selectedIds.has(q.id)) ? "bg-primary-100 text-primary-700" : "bg-white text-gray-500 border border-gray-200"}`}>
                        {uncategorized.every((q) => selectedIds.has(q.id)) ? "Bekor" : "Barchasini"}
                      </button>
                    </div>
                    <div className="divide-y divide-gray-50">
                      {uncategorized.map((q) => (
                        <QuestionRow key={q.id} question={q} isSelected={selectedIds.has(q.id)} isPreview={previewId === q.id} onToggle={() => toggleSelect(q.id)} onPreview={() => setPreviewId(previewId === q.id ? null : q.id)} />
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Preview */}
              {previewQuestion && (
                <div className="border border-primary-200 rounded-xl p-4 bg-primary-50/50">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-primary-700">Preview</h4>
                    <button onClick={() => setPreviewId(null)} className="text-xs text-gray-500">Yopish ✕</button>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-gray-100">
                    <p className="text-sm text-gray-900 font-medium mb-3">{previewQuestion.content}</p>
                    {previewQuestion.options && previewQuestion.options.length > 0 ? (
                      <div className="space-y-2">
                        {previewQuestion.options.map((opt) => (
                          <div key={opt.label} className={`flex items-center gap-3 px-3 py-2 rounded-lg border text-sm ${previewQuestion.correctAnswer === opt.label ? "border-green-300 bg-green-50" : "border-gray-200"}`}>
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${previewQuestion.correctAnswer === opt.label ? "bg-green-500 text-white" : "bg-gray-100 text-gray-500"}`}>{opt.label}</span>
                            <span>{opt.text || "(kiritilmagan)"}</span>
                            {previewQuestion.correctAnswer === opt.label && <span className="ml-auto text-xs text-green-600">✓ To'g'ri</span>}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 italic">Variantlar kiritilmagan</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer - Library */}
            <div className="p-6 border-t border-gray-100 flex items-center justify-between">
              <span className="text-sm text-gray-500">{selectedIds.size > 0 ? `${selectedIds.size} ta savol tanlandi` : "Savol tanlanmagan"}</span>
              <div className="flex items-center gap-3">
                <button onClick={onClose} className="btn-outline">Bekor qilish</button>
                <button onClick={handleImportFromLibrary} disabled={selectedIds.size === 0 || importing} className="btn-primary disabled:opacity-50">
                  {importing ? "Import..." : `Kursga qo'shish (${selectedIds.size})`}
                </button>
              </div>
            </div>
          </>
        )}

        {/* Test Lists Tab */}
        {activeTab === "testlists" && (
          <>
            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {testLists.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-4xl mb-3">📋</p>
                  <p className="text-gray-500">Test list mavjud emas. Testlar bo'limida yarating.</p>
                </div>
              )}

              {testLists.map((list) => {
                const isSelected = selectedListIds.has(list.id);
                const listQuestions = questions.filter((q) => list.testIds.includes(q.id));
                return (
                  <div
                    key={list.id}
                    onClick={() => toggleListSelect(list.id)}
                    className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all ${isSelected ? "border-primary-300 bg-primary-50 shadow-sm" : "border-gray-100 hover:border-primary-200"}`}
                  >
                    <div className="flex-shrink-0">
                      {isSelected ? <CheckSquare className="w-5 h-5 text-primary-500" /> : <Square className="w-5 h-5 text-gray-300" />}
                    </div>
                    <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center flex-shrink-0">
                      <List className="w-5 h-5 text-orange-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 text-sm">{list.title}</h4>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                        <span>📝 {list.testIds.length} savol</span>
                        <span>({listQuestions.length} ta topildi)</span>
                        <span className={`px-1.5 py-0.5 rounded-full ${list.status === "published" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                          {list.status === "published" ? "Published" : "Draft"}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer - Test Lists */}
            <div className="p-6 border-t border-gray-100 flex items-center justify-between">
              <span className="text-sm text-gray-500">{selectedListIds.size > 0 ? `${selectedListIds.size} ta test list tanlandi` : "Test list tanlanmagan"}</span>
              <div className="flex items-center gap-3">
                <button onClick={onClose} className="btn-outline">Bekor qilish</button>
                <button onClick={handleImportFromTestLists} disabled={selectedListIds.size === 0 || importing} className="btn-primary disabled:opacity-50">
                  {importing ? "Import..." : `Import qilish (${selectedListIds.size})`}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ===== QuestionRow =====
function QuestionRow({ question, isSelected, isPreview, onToggle, onPreview }: {
  question: LibQuestion; isSelected: boolean; isPreview: boolean; onToggle: () => void; onPreview: () => void;
}) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3 transition-colors ${isSelected ? "bg-primary-50" : "hover:bg-gray-50"}`}>
      <button onClick={onToggle} className="flex-shrink-0">
        {isSelected ? <CheckSquare className="w-5 h-5 text-primary-500" /> : <Square className="w-5 h-5 text-gray-300" />}
      </button>
      <div className="flex-1 min-w-0 cursor-pointer" onClick={onToggle}>
        <p className="text-sm text-gray-900 truncate">{question.content.startsWith("[IMAGES:") || question.content.startsWith("data:") ? "📷 Rasmli savol" : question.content}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${diffColors[question.difficulty]}`}>{diffLabels[question.difficulty]}</span>
          <span className="text-[10px] text-gray-400">⏱ {question.time}</span>
          {question.tags.slice(0, 2).map((tag) => (<span key={tag} className="text-[10px] text-gray-400">#{tag}</span>))}
        </div>
      </div>
      <button onClick={onPreview} className={`p-1.5 rounded ${isPreview ? "text-primary-600 bg-primary-100" : "text-gray-400 hover:text-primary-500 hover:bg-primary-50"}`} title="Preview">
        {isPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}
