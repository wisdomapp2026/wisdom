import { useState, useEffect } from "react";
import { Plus, Trash2, Edit, Check, X, Settings, Lightbulb } from "lucide-react";
import {
  getMotivationPhrases,
  createMotivationPhrase,
  updateMotivationPhrase,
  deleteMotivationPhrase,
  getMotivationSettings,
  saveMotivationSettings,
} from "@shared/repositories";
import type { MotivationalPhrase, MotivationSettings, MotivationPlacement } from "@shared/types";
import LoadingButton from "../components/LoadingButton";

type Tab = "home" | "courses_list" | "course" | "topic";

export default function Motivations() {
  const [tab, setTab] = useState<Tab>("home");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Motivatsion frazalar</h1>
        <p className="text-gray-500 mt-1">O'quvchilarni rag'batlantirish uchun motivatsion so'zlar boshqaruvi</p>
      </div>

      {/* Tablar */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setTab("home")}
          className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            tab === "home"
              ? "bg-primary-500 text-white"
              : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
          }`}
        >
          🏠 Bosh sahifa
        </button>
        <button
          onClick={() => setTab("courses_list")}
          className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            tab === "courses_list"
              ? "bg-primary-500 text-white"
              : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
          }`}
        >
          📋 Kurslar ro'yxati
        </button>
        <button
          onClick={() => setTab("course")}
          className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            tab === "course"
              ? "bg-primary-500 text-white"
              : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
          }`}
        >
          📚 Kurs ichida
        </button>
        <button
          onClick={() => setTab("topic")}
          className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            tab === "topic"
              ? "bg-primary-500 text-white"
              : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
          }`}
        >
          📖 Dars ichida
        </button>
      </div>

      {/* Tab content */}
      <MotivationTab placement={tab} key={tab} />
    </div>
  );
}


// ===== Tab ichidagi kontent =====
function MotivationTab({ placement }: { placement: MotivationPlacement }) {
  const [phrases, setPhrases] = useState<MotivationalPhrase[]>([]);
  const [settings, setSettings] = useState<MotivationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newText, setNewText] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [showSettings, setShowSettings] = useState(false);

  // Sozlamalar uchun local state
  const [rotateHours, setRotateHours] = useState(2);
  const [displayOrder, setDisplayOrder] = useState<"sequential" | "random">("sequential");

  useEffect(() => {
    loadData();
  }, [placement]);

  async function loadData() {
    setLoading(true);
    try {
      const [p, s] = await Promise.all([
        getMotivationPhrases(placement),
        getMotivationSettings(placement),
      ]);
      setPhrases(p);
      setSettings(s);
      if (s) {
        setRotateHours(s.rotateHours);
        setDisplayOrder(s.displayOrder);
      }
    } catch (err) {
      console.error("Yuklashda xatolik:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd() {
    if (!newText.trim()) return;
    setSaving(true);
    const now = Date.now();
    const phrase: MotivationalPhrase = {
      id: `mp-${now}`,
      placement,
      text: newText.trim(),
      order: phrases.length + 1,
      isActive: true,
      createdAt: now,
    };
    try {
      await createMotivationPhrase(phrase);
      setNewText("");
      setShowAddForm(false);
      await loadData();
    } catch (err) {
      console.error("Qo'shishda xatolik:", err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Bu frazani o'chirishga ishonchingiz komilmi?")) return;
    await deleteMotivationPhrase(id);
    await loadData();
  }

  async function handleSaveEdit(id: string) {
    if (!editText.trim()) return;
    await updateMotivationPhrase(id, { text: editText.trim() });
    setEditingId(null);
    setEditText("");
    await loadData();
  }

  async function handleToggleActive(id: string, current: boolean) {
    await updateMotivationPhrase(id, { isActive: !current });
    await loadData();
  }

  async function handleSaveSettings() {
    setSaving(true);
    const s: MotivationSettings = {
      id: placement,
      placement,
      rotateHours,
      displayOrder,
      updatedAt: Date.now(),
    };
    try {
      await saveMotivationSettings(s);
      setSettings(s);
      setShowSettings(false);
    } catch (err) {
      console.error("Sozlamalarni saqlashda xatolik:", err);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-3 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const placementLabel = placement === "home" ? "Bosh sahifada" : placement === "courses_list" ? "Kurslar ro'yxatida" : placement === "course" ? "Kurs sahifasida" : "Dars (mavzu) ichida";

  return (
    <div className="space-y-5">
      {/* Sozlamalar kartasi */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Settings className="w-4 h-4 text-gray-400" />
              Sozlamalar — {placementLabel}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {settings
                ? `Har ${settings.rotateHours} soatda almashinadi · ${settings.displayOrder === "sequential" ? "Ketma-ket" : "Tasodifiy"} tartibda`
                : "Hali sozlanmagan (default: 2 soat, ketma-ket)"}
            </p>
          </div>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="btn-outline text-sm flex items-center gap-2"
          >
            <Settings className="w-4 h-4" />
            {showSettings ? "Yopish" : "Sozlash"}
          </button>
        </div>

        {showSettings && (
          <div className="mt-4 pt-4 border-t border-gray-100 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Har necha soatda almashtirish
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={72}
                    value={rotateHours}
                    onChange={(e) => setRotateHours(Number(e.target.value))}
                    className="w-24 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-500">soat</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ko'rsatish tartibi
                </label>
                <select
                  value={displayOrder}
                  onChange={(e) => setDisplayOrder(e.target.value as "sequential" | "random")}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                >
                  <option value="sequential">Ketma-ket (1, 2, 3...)</option>
                  <option value="random">Tasodifiy (random)</option>
                </select>
              </div>
            </div>
            <button
              onClick={handleSaveSettings}
              disabled={saving}
              className="btn-primary text-sm"
            >
              {saving ? "Saqlanmoqda..." : "Sozlamalarni saqlash"}
            </button>
          </div>
        )}
      </div>

      {/* Qo'shish tugmasi */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">
          Frazalar ({phrases.length})
        </h3>
        <button
          onClick={() => setShowAddForm(true)}
          className="btn-primary text-sm flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Motivatsion fraza qo'shish
        </button>
      </div>

      {/* Yangi fraza qo'shish formasi */}
      {showAddForm && (
        <div className="bg-white rounded-xl border border-blue-200 p-5 shadow-sm">
          <h4 className="font-medium text-gray-900 mb-3">Yangi fraza</h4>
          <textarea
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            placeholder="Masalan: Har kuni tashlangan kichik qadamlar katta yutuqlarga olib keladi..."
            rows={3}
            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
            autoFocus
          />
          <div className="flex gap-2 mt-3">
            <LoadingButton
              onClick={handleAdd}
              disabled={!newText.trim()}
              className="btn-primary text-sm"
            >
              Qo'shish
            </LoadingButton>
            <button onClick={() => { setShowAddForm(false); setNewText(""); }} className="btn-outline text-sm">
              Bekor
            </button>
          </div>
        </div>
      )}

      {/* Frazalar ro'yxati */}
      <div className="space-y-3">
        {phrases.length === 0 && !showAddForm && (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
            <Lightbulb className="w-12 h-12 text-yellow-400 mx-auto mb-3" />
            <p className="text-gray-500">Hali motivatsion frazalar qo'shilmagan</p>
            <p className="text-sm text-gray-400 mt-1">Yuqoridagi tugma orqali qo'shing</p>
          </div>
        )}

        {phrases.map((phrase, index) => (
          <div
            key={phrase.id}
            className={`bg-white rounded-xl border p-4 shadow-sm transition-all ${
              phrase.isActive ? "border-gray-100" : "border-gray-200 opacity-50"
            }`}
          >
            {editingId === phrase.id ? (
              /* Tahrirlash rejimi */
              <div className="space-y-3">
                <textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button onClick={() => handleSaveEdit(phrase.id)} className="btn-primary text-xs px-3 py-1.5">
                    <Check className="w-3.5 h-3.5 inline mr-1" />Saqlash
                  </button>
                  <button onClick={() => setEditingId(null)} className="btn-outline text-xs px-3 py-1.5">Bekor</button>
                </div>
              </div>
            ) : (
              /* Ko'rish rejimi */
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-yellow-50 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-lg">💡</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 leading-relaxed">"{phrase.text}"</p>
                  <p className="text-xs text-gray-400 mt-1.5">#{index + 1} · {phrase.isActive ? "Faol" : "O'chirilgan"}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {/* Faol/O'chirilgan toggle */}
                  <LoadingButton
                    onClick={() => handleToggleActive(phrase.id, phrase.isActive)}
                    className={`text-[10px] font-medium px-2 py-1 rounded border ${
                      phrase.isActive
                        ? "border-green-200 text-green-600 bg-green-50 hover:bg-green-100"
                        : "border-gray-200 text-gray-500 bg-gray-50 hover:bg-gray-100"
                    }`}
                  >
                    {phrase.isActive ? "Faol" : "O'chiq"}
                  </LoadingButton>
                  <button
                    onClick={() => { setEditingId(phrase.id); setEditText(phrase.text); }}
                    className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded transition-all active:scale-95"
                    title="Tahrirlash"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <LoadingButton
                    onClick={() => handleDelete(phrase.id)}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                    title="O'chirish"
                    iconOnly
                  >
                    <Trash2 className="w-4 h-4" />
                  </LoadingButton>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
