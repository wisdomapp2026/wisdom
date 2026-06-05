import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronRight as ChevRight, Plus, Edit, Trash2, Filter, Search, Eye, Send, FolderPlus, X } from "lucide-react";

// Content Library papkalar (Firebase ga keyinchalik o'tkazamiz)
interface Folder {
  id: string;
  name: string;
  children: Folder[];
}

// Demo questions
const demoQuestions = [
  { id: "q1", content: "Solve for x: 3x + 12 = 36. Show all intermediate steps.", difficulty: "easy", time: "3 mins", tags: ["Algebra", "Linear Equations"] },
  { id: "q2", content: "Determine the area of a right-angled triangle where the base is 5cm and the hypotenuse is 13cm.", difficulty: "medium", time: "5 mins", tags: ["Geometry", "Triangles"] },
  { id: "q3", content: "Compare and contrast the distributive property and the associative property using numerical examples.", difficulty: "medium", time: "6 mins", tags: ["Algebra", "Properties"] },
  { id: "q4", content: "An airplane flies 400 miles against a wind of 20 mph. Find the speed of the plane in still air.", difficulty: "hard", time: "10 mins", tags: ["Word Problems", "Logic"] },
  { id: "q5", content: "Simplify the following polynomial: (4x²- 3x + 5) - (2x²+ x - 8).", difficulty: "easy", time: "4 mins", tags: ["Algebra", "Polynomials"] },
];

const difficultyColors: Record<string, string> = {
  easy: "bg-green-100 text-green-700",
  medium: "bg-yellow-100 text-yellow-700",
  hard: "bg-red-100 text-red-700",
};

export default function TestBuilder() {
  const [folders, setFolders] = useState<Folder[]>([
    { id: "f1", name: "Arifmetika", children: [] },
    { id: "f2", name: "Geometriya", children: [] },
  ]);
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editFolderName, setEditFolderName] = useState("");

  function addFolder() {
    if (!newFolderName.trim()) return;
    setFolders([...folders, { id: `f-${Date.now()}`, name: newFolderName, children: [] }]);
    setNewFolderName("");
    setShowNewFolder(false);
  }

  function deleteFolder(id: string) {
    if (!confirm("Bu papkani o'chirishga ishonchingiz komilmi?")) return;
    setFolders(folders.filter((f) => f.id !== id));
  }

  function saveEditFolder(id: string) {
    setFolders(folders.map((f) => f.id === id ? { ...f, name: editFolderName } : f));
    setEditingFolderId(null);
  }

  function toggleQuestion(id: string) {
    setSelectedQuestions((prev) =>
      prev.includes(id) ? prev.filter((q) => q !== id) : [...prev, id]
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
        <div className="w-64 shrink-0">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-600 uppercase">Content Library</h3>
              <button onClick={() => setShowNewFolder(true)} className="text-primary-500 hover:bg-primary-50 p-1 rounded" title="Papka qo'shish">
                <FolderPlus className="w-4 h-4" />
              </button>
            </div>

            {/* New folder form */}
            {showNewFolder && (
              <div className="mb-3 flex items-center gap-1">
                <input
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addFolder()}
                  placeholder="Papka nomi..."
                  className="flex-1 text-sm border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  autoFocus
                />
                <button onClick={addFolder} className="text-primary-500 p-1"><Plus className="w-4 h-4" /></button>
                <button onClick={() => setShowNewFolder(false)} className="text-gray-400 p-1"><X className="w-4 h-4" /></button>
              </div>
            )}

            {/* Folders list */}
            <div className="space-y-1">
              {folders.map((folder) => (
                <div key={folder.id} className="group">
                  {editingFolderId === folder.id ? (
                    <div className="flex items-center gap-1 px-2 py-1">
                      <input
                        value={editFolderName}
                        onChange={(e) => setEditFolderName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && saveEditFolder(folder.id)}
                        className="flex-1 text-sm border border-gray-200 rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-primary-500"
                        autoFocus
                      />
                      <button onClick={() => saveEditFolder(folder.id)} className="text-green-500 p-0.5"><Plus className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setEditingFolderId(null)} className="text-gray-400 p-0.5"><X className="w-3.5 h-3.5" /></button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-gray-50 cursor-pointer">
                      <div className="flex items-center gap-2">
                        <ChevronDown className="w-3 h-3 text-gray-400" />
                        <span className="text-sm">📁</span>
                        <span className="text-sm font-medium text-gray-700">{folder.name}</span>
                      </div>
                      <div className="hidden group-hover:flex items-center gap-0.5">
                        <button onClick={() => { setEditingFolderId(folder.id); setEditFolderName(folder.name); }} className="text-gray-400 hover:text-primary-500 p-0.5">
                          <Edit className="w-3 h-3" />
                        </button>
                        <button onClick={() => deleteFolder(folder.id)} className="text-gray-400 hover:text-red-500 p-0.5">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {folders.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-4">Papka yo'q. Yangi yarating.</p>
              )}
            </div>
          </div>
        </div>

        {/* Center - Question Explorer */}
        <div className="flex-1">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Question Explorer</h2>
              <div className="flex items-center gap-2">
                <button className="btn-outline text-sm flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  Filters
                </button>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input placeholder="Qidirish..." className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm w-56" />
                </div>
              </div>
            </div>

            {/* Add new question button */}
            <button className="mb-4 btn-primary text-sm flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Yangi test savol qo'shish
            </button>

            {/* Questions list */}
            <div className="space-y-3">
              {demoQuestions.map((q) => (
                <div
                  key={q.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedQuestions.includes(q.id) ? "border-primary-300 bg-primary-50" : "border-gray-200 hover:border-gray-300"
                  }`}
                  onClick={() => toggleQuestion(q.id)}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedQuestions.includes(q.id)}
                      onChange={() => toggleQuestion(q.id)}
                      className="mt-1 w-4 h-4 text-primary-500 rounded"
                    />
                    <div className="flex-1">
                      <p className="text-sm text-gray-900">{q.content}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs text-gray-500">⏱ {q.time}</span>
                        {q.tags.map((tag) => (
                          <span key={tag} className="text-xs text-gray-500">#{tag}</span>
                        ))}
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${difficultyColors[q.difficulty]}`}>
                      {q.difficulty === "easy" ? "Oson" : q.difficulty === "medium" ? "O'rta" : "Qiyin"}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-center text-sm text-gray-400 mt-4">
              {demoQuestions.length} ta savol mavjud
            </p>
          </div>
        </div>

        {/* Right sidebar - Assembled Test */}
        <div className="w-72 shrink-0">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 sticky top-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Assembled Test</h3>
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">Draft v1</span>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-xs text-gray-500 uppercase">Items</p>
                <p className="text-2xl font-bold text-gray-900">{selectedQuestions.length}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">Duration</p>
                <p className="text-2xl font-bold text-gray-900">12 min</p>
              </div>
            </div>

            <div className="flex gap-2 mb-4">
              <button className="flex-1 btn-primary text-sm flex items-center justify-center gap-2">
                <Eye className="w-4 h-4" />
                Preview
              </button>
              <button className="flex-1 btn-outline text-sm flex items-center justify-center gap-2">
                <Send className="w-4 h-4" />
                Publish
              </button>
            </div>

            {/* Selected questions */}
            <div className="space-y-2">
              {selectedQuestions.map((qId, i) => {
                const q = demoQuestions.find((x) => x.id === qId);
                return q ? (
                  <div key={qId} className="flex items-start gap-2 p-2 bg-gray-50 rounded-lg">
                    <span className="text-xs font-bold text-primary-500">Q{i + 1}</span>
                    <p className="text-xs text-gray-600 line-clamp-2">{q.content.slice(0, 60)}...</p>
                  </div>
                ) : null;
              })}
            </div>

            {selectedQuestions.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-4">Savollarni chapdan tanlang</p>
            )}

            {/* Difficulty mix */}
            {selectedQuestions.length > 0 && (
              <div className="mt-4">
                <p className="text-xs text-gray-500 mb-2">Difficulty Mix:</p>
                <div className="flex gap-1 h-2 rounded-full overflow-hidden">
                  <div className="bg-green-500 flex-1" />
                  <div className="bg-yellow-500 flex-1" />
                  <div className="bg-red-500" style={{ width: "20%" }} />
                </div>
              </div>
            )}

            <p className="text-xs text-gray-400 mt-3">* Test auto-saved at {new Date().toLocaleTimeString("uz", { hour: "2-digit", minute: "2-digit" })}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
