import { useState, useEffect } from "react";
import {
  Search,
  Plus,
  Upload,
  Volume2,
  Trash2,
  Edit2,
  BookOpen,
  Filter,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  X,
  RefreshCw,
  Layers,
  Folder,
  FolderPlus,
  Edit3,
} from "lucide-react";
import * as XLSX from "xlsx";
import {
  getVocabularies,
  createVocabulary,
  bulkCreateVocabularies,
  updateVocabulary,
  deleteVocabulary,
  getAllFolders,
  renameVocabularyFolder,
  deleteVocabularyFolder,
} from "@shared/repositories";
import type { Vocabulary } from "@shared/types";

const LEVELS = ["All", "A1", "A2", "B1", "B2", "C1", "C2", "IELTS"];
const PARTS_OF_SPEECH = ["noun", "verb", "adjective", "adverb", "preposition", "idiom", "phrase"];

export default function Vocabularies() {
  const [vocabularies, setVocabularies] = useState<Vocabulary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("All");
  const [selectedFolder, setSelectedFolder] = useState("All");
  const [folders, setFolders] = useState<string[]>(["Umumiy"]);

  // Create / Edit modal
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Vocabulary | null>(null);
  const [formData, setFormData] = useState<Partial<Vocabulary>>({
    word: "",
    phonetic: "",
    translation: "",
    partOfSpeech: "noun",
    definition: "",
    exampleSentence: "",
    exampleTranslation: "",
    level: "A1",
    folder: "Umumiy",
  });
  const [saving, setSaving] = useState(false);

  // Import modal
  const [showImportModal, setShowImportModal] = useState(false);
  const [importData, setImportData] = useState<Partial<Vocabulary>[]>([]);
  const [importFolderName, setImportFolderName] = useState("");
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState("");

  // Folder rename modal
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renamingFolder, setRenamingFolder] = useState("");
  const [newFolderName, setNewFolderName] = useState("");
  const [savingFolder, setSavingFolder] = useState(false);

  // New folder modal
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [createdFolderName, setCreatedFolderName] = useState("");

  // Folder delete modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState("");
  const [deleteMode, setDeleteMode] = useState<"keepWords" | "deleteWords">("deleteWords");
  const [isDeletingFolder, setIsDeletingFolder] = useState(false);

  // Delete confirm
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadVocabularies();
  }, [selectedLevel, selectedFolder]);

  async function loadVocabularies() {
    setLoading(true);
    try {
      const data = await getVocabularies({
        level: selectedLevel === "All" ? undefined : selectedLevel,
        folder: selectedFolder === "All" ? undefined : selectedFolder,
        search: searchTerm,
      });
      setVocabularies(data);

      const fList = await getAllFolders();
      setFolders(fList);
    } catch (err) {
      console.error("Lug'atlarni yuklashda xatolik:", err);
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    loadVocabularies();
  }

  function openCreateModal() {
    setEditingItem(null);
    setFormData({
      word: "",
      phonetic: "",
      translation: "",
      partOfSpeech: "noun",
      definition: "",
      exampleSentence: "",
      exampleTranslation: "",
      level: "A1",
      folder: selectedFolder !== "All" ? selectedFolder : "Umumiy",
    });
    setShowModal(true);
  }

  function openEditModal(v: Vocabulary) {
    setEditingItem(v);
    setFormData({
      ...v,
      folder: v.folder || "Umumiy",
    });
    setShowModal(true);
  }

  async function handleSaveWord(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.word || !formData.translation) {
      alert("So'z va tarjima kiritilishi shart!");
      return;
    }

    setSaving(true);
    try {
      if (editingItem) {
        await updateVocabulary(editingItem.id, formData);
      } else {
        await createVocabulary(formData);
      }
      setShowModal(false);
      await loadVocabularies();
    } catch (err: any) {
      alert("Xatolik yuz berdi: " + (err.message || err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Haqiqatan ham bu so'zni o'chirmoqchimisiz?")) return;
    try {
      setDeletingId(id);
      await deleteVocabulary(id);
      setVocabularies((prev) => prev.filter((v) => v.id !== id));
    } catch (err: any) {
      alert("O'chirishda xatolik: " + err.message);
    } finally {
      setDeletingId(null);
    }
  }

  // Audio talaffuz qilish (Web Speech API)
  function playAudio(word: string) {
    if (!("speechSynthesis" in window)) {
      alert("Brauzeringiz ovozli o'qishni qo'llab-quvvatlamaydi.");
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = "en-US";
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  }

  // Excel faylni o'qish
  function handleExcelUpload(e: React.ChangeEvent<HTMLInputElement>) {
    setImportError("");
    const file = e.target.files?.[0];
    if (!file) return;

    // Fayl nomidan avtomatik papka nomini hosil qilish
    const cleanFileName = file.name
      .replace(/\.[^/.]+$/, "")
      .replace(/[_-]/g, " ")
      .trim();
    setImportFolderName(cleanFileName || "Yangi to'plam");

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const rows: any[] = XLSX.utils.sheet_to_json(ws);

        if (!rows || rows.length === 0) {
          setImportError("Excel faylda hech qanday ma'lumot topilmadi!");
          return;
        }

        // Qatorlarni xaritalash
        const parsed: Partial<Vocabulary>[] = rows.map((r) => {
          const word = r.word || r.Word || r["So'z"] || r.soz || "";
          const translation = r.translation || r.Translation || r["Tarjima"] || r.tarjima || "";
          const phonetic = r.phonetic || r.Phonetic || r["Transkripsiya"] || "";
          const partOfSpeech = (r.partOfSpeech || r["So'z turkumi"] || "noun").toLowerCase();
          const definition = r.definition || r["Ta'rif"] || "";
          const exampleSentence = r.exampleSentence || r.example || r["Misol"] || "";
          const exampleTranslation = r.exampleTranslation || r["Misol tarjimasi"] || "";
          const level = r.level || r.Level || r["Daraja"] || "A1";
          const folder = r.folder || r.Folder || r["Papka"] || r["To'plam"] || cleanFileName || "Umumiy";

          return {
            word: String(word).trim(),
            translation: String(translation).trim(),
            phonetic: String(phonetic).trim(),
            partOfSpeech,
            definition: String(definition).trim(),
            exampleSentence: String(exampleSentence).trim(),
            exampleTranslation: String(exampleTranslation).trim(),
            level: String(level).toUpperCase().trim(),
            folder: String(folder).trim(),
          };
        }).filter((it) => it.word && it.translation);

        if (parsed.length === 0) {
          setImportError("Faylda 'Word' va 'Translation' ustunlari to'g'ri ko'rsatilmagan!");
          return;
        }

        setImportData(parsed);
      } catch (err: any) {
        setImportError("Faylni o'qishda xatolik: " + err.message);
      }
    };
    reader.readAsBinaryString(file);
  }

  async function handleExecuteImport() {
    if (importData.length === 0) return;
    setImporting(true);
    try {
      const targetFolder = importFolderName.trim() || "Umumiy";
      const withFolder = importData.map((d) => ({
        ...d,
        folder: targetFolder,
      }));

      const count = await bulkCreateVocabularies(withFolder, targetFolder);
      alert(`Muvaffaqiyatli ${count} ta so'z "${targetFolder}" papkasiga import qilindi!`);
      setShowImportModal(false);
      setImportData([]);
      setSelectedFolder(targetFolder);
      await loadVocabularies();
    } catch (err: any) {
      alert("Import qilishda xatolik: " + err.message);
    } finally {
      setImporting(false);
    }
  }

  async function handleRenameFolder(e: React.FormEvent) {
    e.preventDefault();
    if (!newFolderName.trim() || newFolderName.trim() === renamingFolder) {
      setShowRenameModal(false);
      return;
    }
    setSavingFolder(true);
    try {
      await renameVocabularyFolder(renamingFolder, newFolderName.trim());
      if (selectedFolder === renamingFolder) {
        setSelectedFolder(newFolderName.trim());
      }
      setShowRenameModal(false);
      await loadVocabularies();
    } catch (err: any) {
      alert("Papkani qayta nomlashda xatolik: " + err.message);
    } finally {
      setSavingFolder(false);
    }
  }

  function openDeleteFolderModal(fName: string) {
    setFolderToDelete(fName);
    setDeleteMode("deleteWords");
    setShowDeleteModal(true);
  }

  async function handleConfirmDeleteFolder() {
    if (!folderToDelete) return;
    setIsDeletingFolder(true);
    try {
      await deleteVocabularyFolder(folderToDelete, deleteMode === "deleteWords");
      alert(`"${folderToDelete}" papkasi muvaffaqiyatli ${deleteMode === "deleteWords" ? "va uning ichidagi barcha so'zlar to'liq" : ""} o'chirildi!`);
      setShowDeleteModal(false);
      if (selectedFolder === folderToDelete) {
        setSelectedFolder("All");
      }
      await loadVocabularies();
    } catch (err: any) {
      alert("Papkani o'chirishda xatolik: " + err.message);
    } finally {
      setIsDeletingFolder(false);
    }
  }

  function handleCreateEmptyFolder(e: React.FormEvent) {
    e.preventDefault();
    const name = createdFolderName.trim();
    if (!name) return;
    if (!folders.includes(name)) {
      setFolders([...folders, name]);
    }
    setSelectedFolder(name);
    setShowNewFolderModal(false);
    setCreatedFolderName("");
  }

  // Namuna shablon yuklab olish
  function downloadTemplate() {
    const templateData = [
      {
        word: "achieve",
        translation: "erishmoq",
        phonetic: "/əˈtʃiːv/",
        partOfSpeech: "verb",
        definition: "to successfully complete something",
        exampleSentence: "She worked hard to achieve her goals.",
        exampleTranslation: "U o'z maqsadlariga erishish uchun qattiq ishladi.",
        level: "B1",
        folder: "General Verbs",
      },
      {
        word: "knowledge",
        translation: "bilim",
        phonetic: "/ˈnɒl.ɪdʒ/",
        partOfSpeech: "noun",
        definition: "information, skills, and understanding",
        exampleSentence: "Knowledge is power.",
        exampleTranslation: "Bilim — bu kuch.",
        level: "A2",
        folder: "Education",
      },
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Lugatlar");
    XLSX.writeFile(wb, "lugat_namuna.xlsx");
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BookOpen className="w-7 h-7 text-indigo-600" />
            Lug'atlar Bazasi (Vocabulary Bank)
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Ingliz tili so'zlarini papkalar (to'plamlar) bo'yicha boshqaring, yangi so'zlar qo'shing yoki Excel orqali ommaviy yuklang.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowImportModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl font-medium border border-emerald-200 transition-colors shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Exceldan Import
          </button>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Yangi So'z
          </button>
        </div>
      </div>

      {/* Papkalar (Folders) Navigatsiya Paneli */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Folder className="w-4 h-4 text-indigo-600" />
            <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              Lug'at Papkalari (To'plamlar)
            </h4>
            <span className="text-xs text-gray-400 font-medium">({folders.length} ta papka)</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {selectedFolder !== "All" && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setRenamingFolder(selectedFolder);
                    setNewFolderName(selectedFolder);
                    setShowRenameModal(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors border border-indigo-200 shadow-sm"
                  title="Tanlangan papka nomini tahrirlash"
                >
                  <Edit3 className="w-3.5 h-3.5 text-indigo-600" />
                  "{selectedFolder}" nomini tahrirlash
                </button>
                <button
                  type="button"
                  onClick={() => openDeleteFolderModal(selectedFolder)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 rounded-xl transition-colors border border-red-200 shadow-sm"
                  title="Tanlangan papkani o'chirish"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-600" />
                  "{selectedFolder}" papkasini o'chirish
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => {
                setCreatedFolderName("");
                setShowNewFolderModal(true);
              }}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl transition-colors shadow-sm"
            >
              <FolderPlus className="w-3.5 h-3.5 text-indigo-600" />
              + Yangi Papka
            </button>
          </div>
        </div>

        {/* Papkalar ro'yxati (Horizontal scroll tabs) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
          <button
            type="button"
            onClick={() => setSelectedFolder("All")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 ${
              selectedFolder === "All"
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Barcha so'zlar
          </button>
          {folders.map((f) => {
            const isSelected = selectedFolder === f;
            return (
              <div
                key={f}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-2 border ${
                  isSelected
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                    : "bg-gray-50 text-gray-700 hover:bg-gray-100 border-gray-200"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setSelectedFolder(f)}
                  className="flex items-center gap-1.5 cursor-pointer"
                >
                  <Folder className={`w-3.5 h-3.5 ${isSelected ? "text-white" : "text-indigo-600"}`} />
                  <span>{f}</span>
                </button>

                {/* Direct Edit & Delete buttons on each tab */}
                <div className="flex items-center gap-0.5 pl-1.5 border-l border-current/20">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setRenamingFolder(f);
                      setNewFolderName(f);
                      setShowRenameModal(true);
                    }}
                    className={`p-1 rounded hover:bg-white/20 transition-colors ${
                      isSelected ? "text-white" : "text-gray-400 hover:text-indigo-600"
                    }`}
                    title="Nomini tahrirlash (Edit)"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openDeleteFolderModal(f);
                    }}
                    className={`p-1 rounded hover:bg-red-500/20 transition-colors ${
                      isSelected ? "text-white hover:text-red-200" : "text-gray-400 hover:text-red-600"
                    }`}
                    title="Papkani o'chirish (Delete)"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row items-center justify-between gap-4">
        <form onSubmit={handleSearch} className="flex items-center gap-2 w-full md:w-96">
          <div className="relative w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="So'z yoki tarjimani qidiring..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-medium transition-colors"
          >
            Qidirish
          </button>
        </form>

        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Daraja:
          </span>
          {LEVELS.map((lvl) => (
            <button
              key={lvl}
              onClick={() => setSelectedLevel(lvl)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedLevel === lvl
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>
      </div>

      {/* Vocabulary Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400 flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
            <p className="text-sm">Lug'atlar yuklanmoqda...</p>
          </div>
        ) : vocabularies.length === 0 ? (
          <div className="p-16 text-center text-gray-400 space-y-3">
            <Layers className="w-12 h-12 mx-auto text-gray-300" />
            <p className="text-base font-medium text-gray-600">Hech qanday so'z topilmadi</p>
            <p className="text-xs text-gray-400">
              Yangi so'z qo'shing yoki Excel fayl orqali lug'atlarni yuklang.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/75 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">So'z (Word)</th>
                  <th className="py-3.5 px-4">Papka</th>
                  <th className="py-3.5 px-4">Transkripsiya</th>
                  <th className="py-3.5 px-4">O'zbekcha Ma'nosi</th>
                  <th className="py-3.5 px-4">Turkumi</th>
                  <th className="py-3.5 px-4">Darajasi</th>
                  <th className="py-3.5 px-4">Misol</th>
                  <th className="py-3.5 px-4 text-right">Amallar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {vocabularies.map((v) => (
                  <tr key={v.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-gray-900 flex items-center gap-2">
                      <span>{v.word}</span>
                      <button
                        onClick={() => playAudio(v.word)}
                        className="p-1 text-gray-400 hover:text-indigo-600 rounded transition-colors"
                        title="Talaffuzni eshitish"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100/60">
                        <Folder className="w-3 h-3 text-indigo-500" />
                        {v.folder || "Umumiy"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-gray-500">
                      {v.phonetic || "—"}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-indigo-950">
                      {v.translation}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-gray-500">
                      <span className="px-2 py-0.5 bg-gray-100 rounded text-gray-600">
                        {v.partOfSpeech || "noun"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 font-bold rounded text-xs">
                        {v.level || "A1"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-gray-500 max-w-xs truncate">
                      {v.exampleSentence ? (
                        <div>
                          <p className="font-medium text-gray-700">{v.exampleSentence}</p>
                          <p className="text-gray-400">{v.exampleTranslation}</p>
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(v)}
                          className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Tahrirlash"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(v.id)}
                          disabled={deletingId === v.id}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="O'chirish"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Word Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-xl border border-gray-100 p-6 space-y-4 my-8">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg text-gray-900">
                {editingItem ? "So'zni tahrirlash" : "Yangi so'z qo'shish"}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveWord} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Inglizcha So'z *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Masalan: persistent"
                    value={formData.word || ""}
                    onChange={(e) => setFormData({ ...formData, word: e.target.value })}
                    className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Tarjimasi (O'zbekcha) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Masalan: qat'iyatli, sabotli"
                    value={formData.translation || ""}
                    onChange={(e) => setFormData({ ...formData, translation: e.target.value })}
                    className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1 flex items-center gap-1">
                    <Folder className="w-3.5 h-3.5 text-indigo-600" /> Papka
                  </label>
                  <input
                    type="text"
                    list="folder-options"
                    value={formData.folder || "Umumiy"}
                    onChange={(e) => setFormData({ ...formData, folder: e.target.value })}
                    placeholder="Masalan: Unit 1"
                    className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
                  />
                  <datalist id="folder-options">
                    {folders.map((f) => (
                      <option key={f} value={f} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Transkripsiya
                  </label>
                  <input
                    type="text"
                    placeholder="/pəˈsɪs.tənt/"
                    value={formData.phonetic || ""}
                    onChange={(e) => setFormData({ ...formData, phonetic: e.target.value })}
                    className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    So'z turkumi
                  </label>
                  <select
                    value={formData.partOfSpeech || "noun"}
                    onChange={(e) => setFormData({ ...formData, partOfSpeech: e.target.value })}
                    className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
                  >
                    {PARTS_OF_SPEECH.map((pos) => (
                      <option key={pos} value={pos}>
                        {pos}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Daraja
                  </label>
                  <select
                    value={formData.level || "A1"}
                    onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                    className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
                  >
                    {LEVELS.filter((l) => l !== "All").map((lvl) => (
                      <option key={lvl} value={lvl}>
                        {lvl}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Inglizcha Ta'rif (Definition)
                </label>
                <textarea
                  rows={2}
                  placeholder="Continuing firmly or obstinately in a course of action..."
                  value={formData.definition || ""}
                  onChange={(e) => setFormData({ ...formData, definition: e.target.value })}
                  className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Misol jumla (English)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Be persistent in pursuing your goals."
                    value={formData.exampleSentence || ""}
                    onChange={(e) => setFormData({ ...formData, exampleSentence: e.target.value })}
                    className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Misol tarjimasi (O'zbekcha)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="O'z maqsadlaringizga erishishda qat'iyatli bo'ling."
                    value={formData.exampleTranslation || ""}
                    onChange={(e) => setFormData({ ...formData, exampleTranslation: e.target.value })}
                    className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  {saving ? "Saqlanmoqda..." : editingItem ? "Yangilash" : "Qo'shish"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Excel / CSV Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl border border-gray-100 overflow-hidden my-8">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-lg text-gray-900">
                  Excel / CSV orqali lug'atlarni yuklash
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportData([]);
                  setImportError("");
                }}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-xs text-emerald-800 space-y-1">
                  <p className="font-semibold">Fayl formati bo'yicha talablar:</p>
                  <p>
                    Excel faylingizda <strong>word</strong> va <strong>translation</strong> ustunlari
                    bo'lishi shart. Ixtiyoriy ustunlar: <em>phonetic, partOfSpeech, definition, exampleSentence, exampleTranslation, level</em>.
                  </p>
                  <button
                    onClick={downloadTemplate}
                    type="button"
                    className="inline-block mt-2 font-bold underline hover:text-emerald-950"
                  >
                    Namuna shablonni yuklab olish (.xlsx)
                  </button>
                </div>
              </div>

              {importError && (
                <div className="bg-red-50 border border-red-100 rounded-xl p-3 flex items-center gap-2 text-xs text-red-700">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {importError}
                </div>
              )}

              {/* Upload Input */}
              <div className="border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center hover:border-indigo-400 transition-colors">
                <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-700">
                  Excel (.xlsx, .xls) yoki CSV faylni tanlang
                </p>
                <p className="text-xs text-gray-400 mt-1">yoki shu yerga sudrab tashlang</p>
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleExcelUpload}
                  className="mt-4 text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                />
              </div>

              {/* Papka Nomi Sozlamasi (Fayl nomidan avtomatik olingan) */}
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-2">
                <label className="block text-xs font-bold text-gray-700 uppercase flex items-center gap-1.5">
                  <Folder className="w-4 h-4 text-indigo-600" />
                  Saqlanadigan Papka (To'plam) Nomi *
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={importFolderName}
                    onChange={(e) => setImportFolderName(e.target.value)}
                    placeholder="Masalan: Unit 1 Family yoki Colors"
                    className="flex-1 px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                  {folders.length > 0 && (
                    <select
                      onChange={(e) => {
                        if (e.target.value) setImportFolderName(e.target.value);
                      }}
                      className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 cursor-pointer"
                      defaultValue=""
                    >
                      <option value="" disabled>Mavjud papkadan tanlash...</option>
                      {folders.map((f) => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                  )}
                </div>
                <p className="text-[11px] text-gray-500">
                  📁 Fayl nomi asosida avtomatik to'ldirildi. Istasangiz qayta nomlashingiz mumkin. Ushbu so'zlar keyinchalik mavzuga biriktirishda shu papka orqali oson tanlanadi!
                </p>
              </div>

              {/* Preview Table */}
              {importData.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-gray-700">
                      Yuklanadigan so'zlar: {importData.length} ta
                    </p>
                    <span className="text-xs text-emerald-600 font-semibold">
                      Tayyor holatda (Papka: {importFolderName || "Umumiy"})
                    </span>
                  </div>
                  <div className="max-h-56 overflow-y-auto border border-gray-200 rounded-xl">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-gray-50 sticky top-0 border-b border-gray-200">
                        <tr>
                          <th className="p-2">So'z</th>
                          <th className="p-2">Tarjimasi</th>
                          <th className="p-2">Daraja</th>
                          <th className="p-2">Misol</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {importData.slice(0, 50).map((row, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="p-2 font-bold">{row.word}</td>
                            <td className="p-2 text-indigo-900">{row.translation}</td>
                            <td className="p-2">{row.level}</td>
                            <td className="p-2 truncate max-w-xs text-gray-500">
                              {row.exampleSentence || "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {importData.length > 50 && (
                    <p className="text-[11px] text-gray-400 text-right">
                      ...va yana {importData.length - 50} ta so'z
                    </p>
                  )}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowImportModal(false);
                    setImportData([]);
                  }}
                  className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50"
                >
                  Bekor qilish
                </button>
                <button
                  type="button"
                  disabled={importData.length === 0 || importing}
                  onClick={handleExecuteImport}
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {importing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Yuklanmoqda...
                    </>
                  ) : (
                    `"${importFolderName || "Umumiy"}" papkasiga saqlash (${importData.length})`
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Papkani Qayta Nomlash Modali */}
      {showRenameModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-gray-100 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-gray-900 flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-indigo-600" />
                Papkani Qayta Nomlash
              </h3>
              <button
                onClick={() => setShowRenameModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRenameFolder} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Eski nom: <span className="text-gray-500 font-normal">{renamingFolder}</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Yangi papka nomini kiriting..."
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRenameModal(false)}
                  className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-xs font-medium hover:bg-gray-50"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={savingFolder || !newFolderName.trim()}
                  className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50"
                >
                  {savingFolder ? "Saqlanmoqda..." : "Saqlash"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Yangi Bo'sh Papka Yaratish Modali */}
      {showNewFolderModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-gray-100 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-gray-900 flex items-center gap-2">
                <FolderPlus className="w-4 h-4 text-indigo-600" />
                Yangi Papka Yaratish
              </h3>
              <button
                onClick={() => setShowNewFolderModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateEmptyFolder} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Papka Nomi *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Masalan: Unit 3 Jobs"
                  value={createdFolderName}
                  onChange={(e) => setCreatedFolderName(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewFolderModal(false)}
                  className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-xs font-medium hover:bg-gray-50"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={!createdFolderName.trim()}
                  className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50"
                >
                  Yaratish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Papkani O'chirish Modali (Variantlar bilan) */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-gray-100 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-red-600 flex items-center gap-2">
                <Trash2 className="w-5 h-5" />
                Papkani O'chirish
              </h3>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-gray-600">
              <strong className="text-gray-900 font-bold">"{folderToDelete}"</strong> papkasini qanday o'chirmoqchisiz? Tanlang:
            </p>

            <div className="space-y-2.5">
              <label
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                  deleteMode === "deleteWords"
                    ? "border-red-500 bg-red-50/60"
                    : "border-gray-200 hover:bg-gray-50"
                }`}
              >
                <input
                  type="radio"
                  name="deleteMode"
                  checked={deleteMode === "deleteWords"}
                  onChange={() => setDeleteMode("deleteWords")}
                  className="mt-0.5 text-red-600 cursor-pointer"
                />
                <div>
                  <p className="text-xs font-bold text-red-700">
                    Papkani va uning barcha so'zlarini TO'LIQ o'chirish
                  </p>
                  <p className="text-[11px] text-red-600 mt-0.5">
                    Papkadagi barcha so'zlar bazadan butunlay o'chiriladi.
                  </p>
                </div>
              </label>

              <label
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                  deleteMode === "keepWords"
                    ? "border-indigo-500 bg-indigo-50/60"
                    : "border-gray-200 hover:bg-gray-50"
                }`}
              >
                <input
                  type="radio"
                  name="deleteMode"
                  checked={deleteMode === "keepWords"}
                  onChange={() => setDeleteMode("keepWords")}
                  className="mt-0.5 text-indigo-600 cursor-pointer"
                />
                <div>
                  <p className="text-xs font-bold text-gray-800">
                    Faqat papkani o'chirish (so'zlarni "Umumiy" ga o'tkazish)
                  </p>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    So'zlar bazada saqlanadi, faqat papka guruhidan chiqariladi.
                  </p>
                </div>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-xs font-medium hover:bg-gray-50"
              >
                Bekor qilish
              </button>
              <button
                type="button"
                disabled={isDeletingFolder}
                onClick={handleConfirmDeleteFolder}
                className="px-5 py-2 bg-red-600 text-white rounded-xl text-xs font-semibold hover:bg-red-700 disabled:opacity-50 flex items-center gap-1.5"
              >
                {isDeletingFolder ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    O'chirilmoqda...
                  </>
                ) : (
                  "Tasdiqlash va O'chirish"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
