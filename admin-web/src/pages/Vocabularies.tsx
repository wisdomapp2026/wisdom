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
} from "lucide-react";
import * as XLSX from "xlsx";
import {
  getVocabularies,
  createVocabulary,
  bulkCreateVocabularies,
  updateVocabulary,
  deleteVocabulary,
} from "@shared/repositories";
import type { Vocabulary } from "@shared/types";

const LEVELS = ["All", "A1", "A2", "B1", "B2", "C1", "C2", "IELTS"];
const PARTS_OF_SPEECH = ["noun", "verb", "adjective", "adverb", "preposition", "idiom", "phrase"];

export default function Vocabularies() {
  const [vocabularies, setVocabularies] = useState<Vocabulary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("All");

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
  });
  const [saving, setSaving] = useState(false);

  // Import modal
  const [showImportModal, setShowImportModal] = useState(false);
  const [importData, setImportData] = useState<Partial<Vocabulary>[]>([]);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState("");

  // Delete confirm
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadVocabularies();
  }, [selectedLevel]);

  async function loadVocabularies() {
    setLoading(true);
    try {
      const data = await getVocabularies({
        level: selectedLevel === "All" ? undefined : selectedLevel,
        search: searchTerm,
      });
      setVocabularies(data);
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
    });
    setShowModal(true);
  }

  function openEditModal(v: Vocabulary) {
    setEditingItem(v);
    setFormData({ ...v });
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
          // Turli ustun nomlarini qabul qilish
          const word = r.word || r.Word || r["So'z"] || r.soz || "";
          const translation = r.translation || r.Translation || r["Tarjima"] || r.tarjima || "";
          const phonetic = r.phonetic || r.Phonetic || r["Transkripsiya"] || "";
          const partOfSpeech = (r.partOfSpeech || r["So'z turkumi"] || "noun").toLowerCase();
          const definition = r.definition || r["Ta'rif"] || "";
          const exampleSentence = r.exampleSentence || r.example || r["Misol"] || "";
          const exampleTranslation = r.exampleTranslation || r["Misol tarjimasi"] || "";
          const level = r.level || r.Level || r["Daraja"] || "A1";

          return {
            word: String(word).trim(),
            translation: String(translation).trim(),
            phonetic: String(phonetic).trim(),
            partOfSpeech,
            definition: String(definition).trim(),
            exampleSentence: String(exampleSentence).trim(),
            exampleTranslation: String(exampleTranslation).trim(),
            level: String(level).toUpperCase().trim(),
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
      const count = await bulkCreateVocabularies(importData);
      alert(`Muvaffaqiyatli ${count} ta so'z import qilindi!`);
      setShowImportModal(false);
      setImportData([]);
      await loadVocabularies();
    } catch (err: any) {
      alert("Import qilishda xatolik: " + err.message);
    } finally {
      setImporting(false);
    }
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
      },
    ];
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Lug'at Namuna");
    XLSX.writeFile(wb, "wisdom_lugat_shablon.xlsx");
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
            Ingliz tili so'zlarini boshqaring, yangi so'zlar qo'shing yoki Excel orqali ommaviy yuklang.
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
                        title="Talaffuzni tinglash"
                        className="p-1 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                    </td>
                    <td className="py-3.5 px-4 text-gray-500 font-mono text-xs">
                      {v.phonetic || "—"}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-indigo-950">
                      {v.translation}
                    </td>
                    <td className="py-3.5 px-4 text-gray-500 text-xs">
                      <span className="px-2 py-0.5 bg-gray-100 rounded-md">
                        {v.partOfSpeech || "noun"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-600 border border-indigo-100">
                        {v.level || "A1"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 max-w-xs truncate text-xs text-gray-500" title={v.exampleSentence}>
                      {v.exampleSentence || "—"}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(v)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
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

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-xl border border-gray-100 overflow-hidden my-8">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
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

            <form onSubmit={handleSaveWord} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    So'z (English) *
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

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

              {/* Preview Table */}
              {importData.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-gray-700">
                      Yuklanadigan so'zlar: {importData.length} ta
                    </p>
                    <span className="text-xs text-emerald-600 font-semibold">
                      Tayyor holatda
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
                    `Barchasini saqlash (${importData.length})`
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
