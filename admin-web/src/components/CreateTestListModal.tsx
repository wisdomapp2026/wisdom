import { useState, useEffect } from "react";
import { X, Search, ChevronDown, ChevronRight, CheckSquare, Square, Eye, EyeOff, List } from "lucide-react";
import { createTestList } from "@shared/repositories";
import type { TestList } from "@shared/types";
import LatexText from "./LatexText";
import { latexPreview } from "../utils/latexPreview";

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
  onClose: () => void;
  onCreated: () => void;
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

export default function CreateTestListModal({ open, onClose, onCreated }: Props) {
  const [step, setStep] = useState<"name" | "select">("name");
  const [listTitle, setListTitle] = useState("");
  const [listDescription, setListDescription] = useState("");

  // Content Library
  const [folders, setFolders] = useState<LibFolder[]>([]);
  const [questions, setQuestions] = useState<LibQuestion[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setStep("name");
      setListTitle("");
      setListDescription("");
      setSelectedIds(new Set());
      setSearchQuery("");
      setPreviewId(null);

      const f = loadFromStorage<LibFolder[]>("tb_folders", []);
      const q = loadFromStorage<LibQuestion[]>("tb_questions", []);
      setFolders(f);
      setQuestions(q);
      setExpandedFolders(new Set(f.map((fo) => fo.id)));
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

  async function handleCreate() {
    if (selectedIds.size === 0) return;
    setSaving(true);
    try {
      const id = `tl-${Date.now()}`;
      const desc = listDescription.trim();
      const testList: Record<string, any> = {
        id,
        title: listTitle.trim(),
        testIds: Array.from(selectedIds),
        status: "draft",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        createdBy: "admin",
      };
      if (desc) {
        testList.description = desc;
      }
      await createTestList(testList as TestList);
      onCreated();
      onClose();
    } catch (err) {
      console.error("Test list yaratishda xatolik:", err);
    } finally {
      setSaving(false);
    }
  }

  const previewQuestion = previewId ? questions.find((q) => q.id === previewId) : null;

  // Step 1: Test list nomi
  if (step === "name") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-gray-900">Test list yaratish</h2>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Test list nomi *</label>
              <input
                type="text"
                value={listTitle}
                onChange={(e) => setListTitle(e.target.value)}
                placeholder="Masalan: Arifmetika testlari"
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tavsif (ixtiyoriy)</label>
              <textarea
                value={listDescription}
                onChange={(e) => setListDescription(e.target.value)}
                placeholder="Qisqacha tavsif..."
                rows={2}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              />
            </div>

            <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
              <button type="button" onClick={onClose} className="flex-1 btn-outline">
                Bekor qilish
              </button>
              <button
                onClick={() => setStep("select")}
                disabled={!listTitle.trim()}
                className="flex-1 btn-primary disabled:opacity-50"
              >
                Keyingi: Savollar tanlash →
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Step 2: Content Library dan savollar tanlash
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl w-full max-w-3xl shadow-xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-2">
              <List className="w-5 h-5 text-orange-500" />
              <h2 className="text-lg font-bold text-gray-900">{listTitle}</h2>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">Content Library dan testlarni tanlang</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="px-6 pt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Savollarni qidirish..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {questions.length === 0 && (
            <div className="text-center py-12">
              <p className="text-4xl mb-3">📝</p>
              <p className="text-gray-500">Content Library bo'sh. Avval Test Builder da savollar yarating.</p>
            </div>
          )}

          {/* Papkalar */}
          {folders.map((folder) => {
            const folderQuestions = getQuestionsInFolder(folder.id).filter(matchesSearch);
            const isExpanded = expandedFolders.has(folder.id);
            const allSelected = folderQuestions.length > 0 && folderQuestions.every((q) => selectedIds.has(q.id));

            return (
              <div key={folder.id} className="border border-gray-100 rounded-xl overflow-hidden">
                <div
                  className="flex items-center gap-3 p-3 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => toggleFolder(folder.id)}
                >
                  {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                  <span className="text-lg">📁</span>
                  <span className="font-medium text-gray-700 text-sm">{folder.name}</span>
                  <span className="text-[10px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full">{folderQuestions.length}</span>
                  {folderQuestions.length > 0 && (
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleSelectAll(folderQuestions); }}
                      className={`ml-auto text-xs px-2 py-1 rounded ${allSelected ? "bg-primary-100 text-primary-700" : "bg-white text-gray-500 border border-gray-200 hover:border-primary-300"}`}
                    >
                      {allSelected ? "Bekor qilish" : "Barchasini tanlash"}
                    </button>
                  )}
                </div>

                {isExpanded && (
                  <div className="divide-y divide-gray-50">
                    {folderQuestions.length === 0 && (
                      <p className="text-xs text-gray-400 text-center py-4 italic">Bu papkada savol yo'q</p>
                    )}
                    {folderQuestions.map((q) => (
                      <QuestionItem
                        key={q.id}
                        question={q}
                        isSelected={selectedIds.has(q.id)}
                        isPreview={previewId === q.id}
                        onToggle={() => toggleSelect(q.id)}
                        onPreview={() => setPreviewId(previewId === q.id ? null : q.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Papkaga biriktirilmagan */}
          {(() => {
            const uncategorized = getUncategorizedQuestions().filter(matchesSearch);
            if (uncategorized.length === 0) return null;
            return (
              <div className="border border-gray-100 rounded-xl overflow-hidden">
                <div className="flex items-center gap-3 p-3 bg-gray-50">
                  <span className="text-lg">📋</span>
                  <span className="font-medium text-gray-700 text-sm">Boshqa savollar</span>
                  <span className="text-[10px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full">{uncategorized.length}</span>
                  <button
                    onClick={() => toggleSelectAll(uncategorized)}
                    className={`ml-auto text-xs px-2 py-1 rounded ${uncategorized.every((q) => selectedIds.has(q.id)) ? "bg-primary-100 text-primary-700" : "bg-white text-gray-500 border border-gray-200"}`}
                  >
                    {uncategorized.every((q) => selectedIds.has(q.id)) ? "Bekor qilish" : "Barchasini tanlash"}
                  </button>
                </div>
                <div className="divide-y divide-gray-50">
                  {uncategorized.map((q) => (
                    <QuestionItem
                      key={q.id}
                      question={q}
                      isSelected={selectedIds.has(q.id)}
                      isPreview={previewId === q.id}
                      onToggle={() => toggleSelect(q.id)}
                      onPreview={() => setPreviewId(previewId === q.id ? null : q.id)}
                    />
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Preview */}
          {previewQuestion && (
            <div className="border border-primary-200 rounded-xl p-4 bg-primary-50/50">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-primary-700">Savol ko'rish (Preview)</h4>
                <button onClick={() => setPreviewId(null)} className="text-xs text-gray-500 hover:text-gray-700">Yopish ✕</button>
              </div>
              <div className="bg-white rounded-lg p-4 border border-gray-100">
                <div className="text-sm text-gray-900 font-medium mb-3"><LatexText text={previewQuestion.content} /></div>
                {previewQuestion.options && previewQuestion.options.length > 0 ? (
                  <div className="space-y-2">
                    {previewQuestion.options.map((opt) => (
                      <div
                        key={opt.label}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg border text-sm ${previewQuestion.correctAnswer === opt.label ? "border-green-300 bg-green-50 text-green-800" : "border-gray-200 text-gray-700"}`}
                      >
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${previewQuestion.correctAnswer === opt.label ? "bg-green-500 text-white" : "bg-gray-100 text-gray-500"}`}>{opt.label}</span>
                        <span>{opt.text ? <LatexText text={opt.text} /> : "(variant kiritilmagan)"}</span>
                        {previewQuestion.correctAnswer === opt.label && <span className="ml-auto text-xs text-green-600 font-medium">✓ To'g'ri javob</span>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic">Variantlar kiritilmagan</p>
                )}
                <div className="flex items-center gap-3 mt-3 text-xs text-gray-500">
                  <span className={`px-2 py-0.5 rounded-full ${diffColors[previewQuestion.difficulty]}`}>{diffLabels[previewQuestion.difficulty]}</span>
                  <span>⏱ {previewQuestion.time}</span>
                  {previewQuestion.tags.map((tag) => (<span key={tag} className="bg-gray-100 px-1.5 py-0.5 rounded">#{tag}</span>))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setStep("name")} className="text-sm text-gray-500 hover:text-gray-700">← Orqaga</button>
            <span className="text-sm text-gray-500">
              {selectedIds.size > 0 ? `${selectedIds.size} ta savol tanlandi` : "Savol tanlanmagan"}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={onClose} className="btn-outline">Bekor qilish</button>
            <button
              onClick={handleCreate}
              disabled={selectedIds.size === 0 || saving}
              className="btn-primary disabled:opacity-50"
            >
              {saving ? "Yaratilmoqda..." : `Test list yaratish (${selectedIds.size} savol)`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== QuestionItem =====
function QuestionItem({ question, isSelected, isPreview, onToggle, onPreview }: {
  question: LibQuestion; isSelected: boolean; isPreview: boolean; onToggle: () => void; onPreview: () => void;
}) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3 transition-colors ${isSelected ? "bg-primary-50" : "hover:bg-gray-50"}`}>
      <button onClick={onToggle} className="flex-shrink-0">
        {isSelected ? <CheckSquare className="w-5 h-5 text-primary-500" /> : <Square className="w-5 h-5 text-gray-300" />}
      </button>
      <div className="flex-1 min-w-0 cursor-pointer" onClick={onToggle}>
        <p className="text-sm text-gray-900 truncate">
          {question.content.startsWith("[IMAGES:") || question.content.startsWith("data:") ? "📷 Rasmli savol" : latexPreview(question.content, 70)}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${diffColors[question.difficulty]}`}>{diffLabels[question.difficulty]}</span>
          <span className="text-[10px] text-gray-400">⏱ {question.time}</span>
          {question.tags.slice(0, 2).map((tag) => (<span key={tag} className="text-[10px] text-gray-400">#{tag}</span>))}
        </div>
      </div>
      <button
        onClick={onPreview}
        className={`p-1.5 rounded transition-colors ${isPreview ? "text-primary-600 bg-primary-100" : "text-gray-400 hover:text-primary-500 hover:bg-primary-50"}`}
        title="Preview"
      >
        {isPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}
