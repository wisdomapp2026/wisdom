import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronRight as ChevRight, Plus, Edit, Trash2, Filter, Search, Eye, Send, FolderPlus, X, GripVertical } from "lucide-react";

interface Folder {
  id: string;
  name: string;
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
}

const initialQuestions: Question[] = [
  { id: "q1", content: "Solve for x: 3x + 12 = 36. Show all intermediate steps.", difficulty: "easy", time: "3 mins", tags: ["Algebra", "Linear Equations"], order: 1 },
  { id: "q2", content: "Determine the area of a right-angled triangle where the base is 5cm and the hypotenuse is 13cm.", difficulty: "medium", time: "5 mins", tags: ["Geometry", "Triangles"], order: 2 },
  { id: "q3", content: "Compare and contrast the distributive property and the associative property using numerical examples.", difficulty: "medium", time: "6 mins", tags: ["Algebra", "Properties"], order: 3 },
  { id: "q4", content: "An airplane flies 400 miles against a wind of 20 mph. Find the speed of the plane in still air.", difficulty: "hard", time: "10 mins", tags: ["Word Problems", "Logic"], order: 4 },
  { id: "q5", content: "Simplify the following polynomial: (4x²- 3x + 5) - (2x²+ x - 8).", difficulty: "easy", time: "4 mins", tags: ["Algebra", "Polynomials"], order: 5 },
];

const diffColors: Record<string, string> = { easy: "bg-green-100 text-green-700", medium: "bg-yellow-100 text-yellow-700", hard: "bg-red-100 text-red-700" };
const diffLabels: Record<string, string> = { easy: "Oson", medium: "O'rta", hard: "Qiyin" };

export default function TestBuilder() {
  const [folders, setFolders] = useState<Folder[]>([
    { id: "f1", name: "Arifmetika", questionIds: [] },
    { id: "f2", name: "Geometriya", questionIds: [] },
  ]);
  const [questions, setQuestions] = useState<Question[]>(initialQuestions);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editFolderName, setEditFolderName] = useState("");
  const [draggedIds, setDraggedIds] = useState<string[]>([]);

  // Eng oxirgi yaratilgan test yuqorida (order bo'yicha teskari)
  const sortedQuestions = [...questions].sort((a, b) => b.order - a.order);

  // Folder CRUD
  function addFolder() {
    if (!newFolderName.trim()) return;
    setFolders([...folders, { id: `f-${Date.now()}`, name: newFolderName, questionIds: [] }]);
    setNewFolderName("");
    setShowNewFolder(false);
  }
  function deleteFolder(id: string) {
    if (!confirm("Papkani o'chirishga ishonchingiz komilmi?")) return;
    setFolders(folders.filter((f) => f.id !== id));
  }
  function saveEditFolder(id: string) {
    setFolders(folders.map((f) => f.id === id ? { ...f, name: editFolderName } : f));
    setEditingFolderId(null);
  }

  // Selection
  function toggleSelect(id: string) {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }
  function selectAll() {
    if (selectedIds.length === questions.length) setSelectedIds([]);
    else setSelectedIds(questions.map((q) => q.id));
  }

  // Delete question
  function deleteQuestion(id: string) {
    if (!confirm("Bu testni o'chirishga ishonchingiz komilmi?")) return;
    setQuestions(questions.filter((q) => q.id !== id));
    setSelectedIds(selectedIds.filter((x) => x !== id));
  }

  // Drag & Drop — papkaga tashlash
  function handleDragStart(ids: string[]) {
    setDraggedIds(ids.length > 0 ? ids : selectedIds);
  }
  function handleDropOnFolder(folderId: string) {
    const idsToMove = draggedIds.length > 0 ? draggedIds : selectedIds;
    if (idsToMove.length === 0) return;
    setFolders(folders.map((f) => f.id === folderId ? { ...f, questionIds: [...new Set([...f.questionIds, ...idsToMove])] } : f));
    setQuestions(questions.map((q) => idsToMove.includes(q.id) ? { ...q, folderId } : q));
    setDraggedIds([]);
    setSelectedIds([]);
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
        <div className="w-56 shrink-0">
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

            {/* Folders */}
            <div className="space-y-1">
              {folders.map((folder) => (
                <div
                  key={folder.id}
                  className="group"
                  onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("bg-primary-50"); }}
                  onDragLeave={(e) => { e.currentTarget.classList.remove("bg-primary-50"); }}
                  onDrop={(e) => { e.preventDefault(); e.currentTarget.classList.remove("bg-primary-50"); handleDropOnFolder(folder.id); }}
                >
                  {editingFolderId === folder.id ? (
                    <div className="flex items-center gap-1 px-2 py-1">
                      <input value={editFolderName} onChange={(e) => setEditFolderName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && saveEditFolder(folder.id)} className="flex-1 text-sm border border-gray-200 rounded px-2 py-0.5 focus:outline-none" autoFocus />
                      <button onClick={() => saveEditFolder(folder.id)} className="text-green-500 p-0.5">✓</button>
                      <button onClick={() => setEditingFolderId(null)} className="text-gray-400 p-0.5"><X className="w-3.5 h-3.5" /></button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between px-2 py-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                      <div className="flex items-center gap-2">
                        <ChevronDown className="w-3 h-3 text-gray-400" />
                        <span>📁</span>
                        <span className="text-sm font-medium text-gray-700">{folder.name}</span>
                        {folder.questionIds.length > 0 && (
                          <span className="text-[10px] bg-primary-100 text-primary-600 px-1.5 rounded-full">{folder.questionIds.length}</span>
                        )}
                      </div>
                      <div className="hidden group-hover:flex items-center">
                        <button onClick={() => { setEditingFolderId(folder.id); setEditFolderName(folder.name); }} className="text-gray-400 hover:text-primary-500 p-0.5"><Edit className="w-3 h-3" /></button>
                        <button onClick={() => deleteFolder(folder.id)} className="text-gray-400 hover:text-red-500 p-0.5"><Trash2 className="w-3 h-3" /></button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {folders.length === 0 && <p className="text-xs text-gray-400 text-center py-4">Papka yo'q</p>}
            </div>

            {/* Drag hint */}
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

            {/* Actions bar */}
            <div className="flex items-center gap-3 mb-4">
              <button className="btn-primary text-sm flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Yangi test savol qo'shish
              </button>
              <button onClick={selectAll} className="btn-outline text-sm">
                {selectedIds.length === questions.length ? "Barchasini bekor" : "Barchasini belgilash"}
              </button>
              {selectedIds.length > 0 && (
                <span className="text-xs text-gray-500">{selectedIds.length} ta tanlangan</span>
              )}
            </div>

            {/* Questions list — eng oxirgi yaratilgan yuqorida */}
            <div className="space-y-3">
              {sortedQuestions.map((q) => (
                <div
                  key={q.id}
                  draggable
                  onDragStart={() => handleDragStart(selectedIds.includes(q.id) ? selectedIds : [q.id])}
                  className={`p-4 border rounded-lg cursor-grab active:cursor-grabbing transition-all ${
                    selectedIds.includes(q.id) ? "border-primary-300 bg-primary-50" : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Drag handle */}
                    <GripVertical className="w-4 h-4 text-gray-300 mt-1 shrink-0" />
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(q.id)}
                      onChange={() => toggleSelect(q.id)}
                      className="mt-1 w-4 h-4 text-primary-500 rounded shrink-0"
                    />
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900">{q.content}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs text-gray-500">⏱ {q.time}</span>
                        {q.tags.map((tag) => (
                          <span key={tag} className="text-xs text-gray-500">#{tag}</span>
                        ))}
                        {q.folderId && (
                          <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">📁 {folders.find((f) => f.id === q.folderId)?.name}</span>
                        )}
                      </div>
                    </div>
                    {/* Difficulty */}
                    <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${diffColors[q.difficulty]}`}>{diffLabels[q.difficulty]}</span>
                    {/* Edit/Delete */}
                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      <button className="p-1.5 text-gray-400 hover:text-primary-500 rounded hover:bg-gray-50" title="Tahrirlash">
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => deleteQuestion(q.id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded hover:bg-red-50" title="O'chirish">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-center text-sm text-gray-400 mt-4">{questions.length} ta savol mavjud</p>
          </div>
        </div>
      </div>
    </div>
  );
}
