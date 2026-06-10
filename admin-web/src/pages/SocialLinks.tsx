import { useState, useEffect } from "react";
import { Plus, Trash2, Edit, Check, X, ExternalLink, Upload } from "lucide-react";
import { getAllSocialLinks, createSocialLink, updateSocialLink, deleteSocialLink } from "@shared/repositories";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@shared/firebase";
import type { SocialLink, SocialPlatform } from "@shared/types";

/** Platformalar ro'yxati va ularning ikonkalari */
const PLATFORMS: { value: SocialPlatform; label: string; color: string; icon: string }[] = [
  { value: "telegram", label: "Telegram", color: "#0088cc", icon: "✈️" },
  { value: "instagram", label: "Instagram", color: "#E4405F", icon: "📸" },
  { value: "youtube", label: "YouTube", color: "#FF0000", icon: "▶️" },
  { value: "facebook", label: "Facebook", color: "#1877F2", icon: "📘" },
  { value: "tiktok", label: "TikTok", color: "#000000", icon: "🎵" },
  { value: "twitter", label: "Twitter / X", color: "#1DA1F2", icon: "🐦" },
  { value: "linkedin", label: "LinkedIn", color: "#0A66C2", icon: "💼" },
  { value: "website", label: "Veb-sayt", color: "#6B7280", icon: "🌐" },
];

function getPlatformInfo(platform: SocialPlatform) {
  return PLATFORMS.find((p) => p.value === platform) || PLATFORMS[7];
}

export default function SocialLinks() {
  const [links, setLinks] = useState<SocialLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editUrl, setEditUrl] = useState("");

  // Yangi qo'shish uchun
  const [newPlatform, setNewPlatform] = useState<SocialPlatform>("telegram");
  const [newLabel, setNewLabel] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newIconFile, setNewIconFile] = useState<File | null>(null);
  const [newIconPreview, setNewIconPreview] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const data = await getAllSocialLinks();
      setLinks(data);
    } catch (err) {
      console.error("Ijtimoiy tarmoqlarni yuklashda xatolik:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd() {
    if (!newUrl.trim()) return;
    setSaving(true);
    const now = Date.now();
    const platformInfo = getPlatformInfo(newPlatform);

    let iconUrl = "";
    // Ikonka upload
    if (newIconFile) {
      try {
        const storageRef = ref(storage, `social-icons/${now}-${newIconFile.name}`);
        await uploadBytes(storageRef, newIconFile);
        iconUrl = await getDownloadURL(storageRef);
      } catch (err) {
        console.error("Ikonka yuklashda xatolik:", err);
      }
    }

    const link: SocialLink = {
      id: `social-${now}`,
      platform: newPlatform,
      label: newLabel.trim() || platformInfo.label,
      url: newUrl.trim(),
      iconUrl: iconUrl || undefined,
      isActive: true,
      order: links.length + 1,
      createdAt: now,
      updatedAt: now,
    };
    try {
      await createSocialLink(link);
      setShowAddForm(false);
      setNewPlatform("telegram");
      setNewLabel("");
      setNewUrl("");
      setNewIconFile(null);
      setNewIconPreview("");
      await loadData();
    } catch (err) {
      console.error("Qo'shishda xatolik:", err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Bu ijtimoiy tarmoq havolasini o'chirishga ishonchingiz komilmi?")) return;
    await deleteSocialLink(id);
    await loadData();
  }

  async function handleToggleActive(id: string, current: boolean) {
    await updateSocialLink(id, { isActive: !current });
    await loadData();
  }

  async function handleSaveEdit(id: string) {
    if (!editUrl.trim()) return;
    await updateSocialLink(id, { label: editLabel.trim(), url: editUrl.trim() });
    setEditingId(null);
    await loadData();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-3 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Ijtimoiy tarmoqlar</h1>
        <p className="text-gray-500 mt-1">O'quvchilarga ko'rinadigan ijtimoiy tarmoq havolalarini boshqarish</p>
      </div>

      {/* Qo'shish tugmasi */}
      <button
        onClick={() => setShowAddForm(true)}
        className="btn-primary flex items-center gap-2 text-sm"
      >
        <Plus className="w-4 h-4" />
        Ijtimoiy tarmoq qo'shish
      </button>

      {/* Yangi qo'shish formasi */}
      {showAddForm && (
        <div className="bg-white rounded-xl border border-blue-200 p-5 shadow-sm space-y-4">
          <h3 className="font-semibold text-gray-900">Yangi ijtimoiy tarmoq qo'shish</h3>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Platforma *</label>
              <select
                value={newPlatform}
                onChange={(e) => {
                  setNewPlatform(e.target.value as SocialPlatform);
                  const info = PLATFORMS.find((p) => p.value === e.target.value);
                  if (info && !newLabel) setNewLabel(info.label);
                }}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm"
              >
                {PLATFORMS.map((p) => (
                  <option key={p.value} value={p.value}>{p.icon} {p.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
              <input
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder={getPlatformInfo(newPlatform).label}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">URL *</label>
              <input
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="https://t.me/edukids_uz"
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          {/* Platformalar grid — tez tanlash */}
          <div>
            <p className="text-xs text-gray-500 mb-2">Tez tanlash:</p>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => { setNewPlatform(p.value); if (!newLabel) setNewLabel(p.label); }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    newPlatform === p.value
                      ? "border-primary-300 bg-primary-50 text-primary-700"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <span>{p.icon}</span> {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Ikonka upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Maxsus ikonka (ixtiyoriy)</label>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 cursor-pointer hover:bg-gray-50">
                <Upload className="w-4 h-4" />
                {newIconFile ? newIconFile.name : "Rasm tanlash"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setNewIconFile(file);
                      setNewIconPreview(URL.createObjectURL(file));
                    }
                  }}
                />
              </label>
              {newIconPreview && (
                <div className="flex items-center gap-2">
                  <img src={newIconPreview} alt="" className="w-8 h-8 rounded-lg object-cover border border-gray-200" />
                  <button type="button" onClick={() => { setNewIconFile(null); setNewIconPreview(""); }} className="text-xs text-red-500">✕</button>
                </div>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-1">Yuklanmasa default platforma ikonkasi ishlatiladi</p>
          </div>

          <div className="flex gap-2 pt-2">
            <button onClick={handleAdd} disabled={saving || !newUrl.trim()} className="btn-primary text-sm disabled:opacity-50">
              {saving ? "Qo'shilmoqda..." : "Qo'shish"}
            </button>
            <button onClick={() => { setShowAddForm(false); setNewUrl(""); setNewLabel(""); }} className="btn-outline text-sm">
              Bekor
            </button>
          </div>
        </div>
      )}

      {/* Havolalar ro'yxati */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Ijtimoiy tarmoqlar ({links.length})</h3>
          <p className="text-xs text-gray-400 mt-0.5">Faol havolalar student appda ko'rinadi</p>
        </div>

        {links.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-4xl mb-3">🌐</p>
            <p>Hali ijtimoiy tarmoq havolalari qo'shilmagan</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {links.map((link) => {
              const info = getPlatformInfo(link.platform);

              if (editingId === link.id) {
                return (
                  <div key={link.id} className="p-4 bg-blue-50/50 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        value={editLabel}
                        onChange={(e) => setEditLabel(e.target.value)}
                        placeholder="Nom"
                        className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                      <input
                        value={editUrl}
                        onChange={(e) => setEditUrl(e.target.value)}
                        placeholder="URL"
                        className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleSaveEdit(link.id)} className="btn-primary text-xs px-3 py-1.5">
                        <Check className="w-3.5 h-3.5 inline mr-1" />Saqlash
                      </button>
                      <button onClick={() => setEditingId(null)} className="btn-outline text-xs px-3 py-1.5">Bekor</button>
                    </div>
                  </div>
                );
              }

              return (
                <div key={link.id} className={`flex items-center p-4 gap-4 ${!link.isActive ? "opacity-50" : ""}`}>
                  {/* Icon */}
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-lg overflow-hidden"
                    style={{ backgroundColor: link.iconUrl ? "transparent" : info.color + "15" }}
                  >
                    {link.iconUrl ? (
                      <img src={link.iconUrl} alt="" className="w-10 h-10 object-cover rounded-full" />
                    ) : (
                      info.icon
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-gray-900">{link.label}</h4>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: info.color + "15", color: info.color }}>
                        {info.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 truncate mt-0.5">{link.url}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handleToggleActive(link.id, link.isActive)}
                      className={`text-[10px] font-medium px-2 py-1 rounded border ${
                        link.isActive
                          ? "border-green-200 text-green-600 bg-green-50 hover:bg-green-100"
                          : "border-gray-200 text-gray-500 bg-gray-50 hover:bg-gray-100"
                      }`}
                    >
                      {link.isActive ? "Faol" : "O'chiq"}
                    </button>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 text-gray-400 hover:text-primary-500 hover:bg-primary-50 rounded"
                      title="Ochish"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                    <button
                      onClick={() => { setEditingId(link.id); setEditLabel(link.label); setEditUrl(link.url); }}
                      className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded"
                      title="Tahrirlash"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(link.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                      title="O'chirish"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
