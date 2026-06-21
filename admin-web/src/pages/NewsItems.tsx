import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Eye, EyeOff, X, Image, Video, FileText } from "lucide-react";
import { getAllNewsItems, createNewsItem, updateNewsItem, deleteNewsItem } from "@shared/repositories";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@shared/firebase";
import type { NewsItem, NewsItemType } from "@shared/types";

export default function NewsItems() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<NewsItem | null>(null);

  // Form
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [type, setType] = useState<NewsItemType>("image");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [duration, setDuration] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const data = await getAllNewsItems();
    setItems(data);
    setLoading(false);
  }

  function openCreate() {
    setEditItem(null);
    setTitle(""); setBody(""); setType("image"); setImageFile(null); setImagePreview(""); setVideoUrl(""); setDuration(""); setLinkUrl("");
    setShowForm(true);
  }

  function openEdit(item: NewsItem) {
    setEditItem(item);
    setTitle(item.title); setBody(item.body || ""); setType(item.type);
    setImagePreview(item.imageUrl || ""); setVideoUrl(item.videoUrl || ""); setDuration(item.duration || "");
    setLinkUrl(item.linkUrl || ""); setImageFile(null);
    setShowForm(true);
  }

  async function handleSave() {
    if (!title.trim()) return;
    setSaving(true);
    const now = Date.now();

    let imageUrl = editItem?.imageUrl || "";
    if (imageFile) {
      const storageRef = ref(storage, `news/${now}-${imageFile.name}`);
      await uploadBytes(storageRef, imageFile);
      imageUrl = await getDownloadURL(storageRef);
    }

    try {
      if (editItem) {
        await updateNewsItem(editItem.id, {
          title: title.trim(), body: body.trim(), type,
          imageUrl: imageUrl || undefined, videoUrl: videoUrl.trim() || undefined,
          duration: duration.trim() || undefined, linkUrl: linkUrl.trim() || undefined,
        });
      } else {
        const item: NewsItem = {
          id: `news-${now}`, title: title.trim(), body: body.trim(), type,
          imageUrl: imageUrl || undefined, videoUrl: videoUrl.trim() || undefined,
          videoType: videoUrl.includes("youtube") || videoUrl.includes("youtu.be") ? "youtube" : "upload",
          duration: duration.trim() || undefined, linkUrl: linkUrl.trim() || undefined,
          isActive: true, order: items.length + 1,
          createdAt: now, updatedAt: now,
        };
        await createNewsItem(item);
      }
      setShowForm(false);
      await loadData();
    } catch (err) {
      console.error("Yangilik saqlashda xatolik:", err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Bu yangilikni o'chirishga ishonchingiz komilmi?")) return;
    await deleteNewsItem(id);
    await loadData();
  }

  async function handleToggle(item: NewsItem) {
    await updateNewsItem(item.id, { isActive: !item.isActive });
    await loadData();
  }

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-3 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>;

  const typeIcons: Record<NewsItemType, React.ReactNode> = {
    image: <Image className="w-4 h-4 text-green-500" />,
    video: <Video className="w-4 h-4 text-purple-500" />,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Yangiliklar</h1>
          <p className="text-gray-500 mt-1">Bosh sahifadagi yangiliklar bo'limini boshqarish</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Yangilik qo'shish
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-primary-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-gray-900">{editItem ? "Yangilikni tahrirlash" : "Yangi yangilik"}</h3>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
          </div>

          {/* Tur tanlash */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Yangilik turi</label>
            <div className="flex gap-2">
              {(["image", "video"] as NewsItemType[]).map((t) => (
                <button key={t} type="button" onClick={() => setType(t)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border ${type === t ? "border-primary-400 bg-primary-50 text-primary-700" : "border-gray-200 text-gray-600"}`}>
                  {typeIcons[t]} {t === "image" ? "Rasmli" : "Videoli"}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Sarlavha *</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Yangilik sarlavhasi" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm" required />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Matn (batafsil)</label>
              <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Yangilik haqida batafsil yozing..." rows={4} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm resize-none" />
            </div>

            {/* Rasm */}
            {(type === "image" || type === "video") && (
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Rasm {type === "image" ? "*" : "(thumbnail)"}</label>
                <div className="flex items-center gap-3">
                  {imagePreview && <img src={imagePreview} alt="" className="h-16 rounded-lg border" />}
                  <label className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 cursor-pointer hover:bg-gray-50">
                    📷 Rasm tanlash
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setImageFile(f); setImagePreview(URL.createObjectURL(f)); } }} />
                  </label>
                </div>
              </div>
            )}

            {/* Tashqi havola (rasmli yangilik uchun) */}
            {type === "image" && (
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Tashqi havola (ixtiyoriy)</label>
                <input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://example.com/..." className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm" />
                <p className="text-xs text-gray-400 mt-1">Agar URL bo'lsa — student bosganda brauzerda ochiladi</p>
              </div>
            )}

            {/* Video URL */}
            {type === "video" && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Video URL</label>
                  <input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://youtube.com/watch?v=..." className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Davomiylik</label>
                  <input value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="03:45" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm" />
                </div>
              </>
            )}
          </div>

          <div className="flex gap-3">
            <button onClick={handleSave} disabled={saving || !title.trim()} className="btn-primary disabled:opacity-50">
              {saving ? "Saqlanmoqda..." : editItem ? "Saqlash" : "Yaratish"}
            </button>
            <button onClick={() => setShowForm(false)} className="btn-outline">Bekor</button>
          </div>
        </div>
      )}

      {/* Ro'yxat */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {items.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-4xl mb-3">📰</p>
            <p>Hali yangilik qo'shilmagan</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {items.map((item) => (
              <div key={item.id} className={`flex items-center gap-4 p-4 ${!item.isActive ? "opacity-50" : ""}`}>
                <div className="w-16 h-12 rounded-lg bg-gray-100 shrink-0 overflow-hidden flex items-center justify-center">
                  {item.imageUrl ? <img src={item.imageUrl} alt="" className="w-full h-full object-cover" /> : typeIcons[item.type]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm truncate">{item.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-gray-400">{item.type === "video" ? "🎬 Video" : "🖼️ Rasm"}</span>
                    {item.duration && <span className="text-[10px] text-gray-400">⏱ {item.duration}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button onClick={() => handleToggle(item)} className={`p-1.5 rounded-lg ${item.isActive ? "text-green-600 hover:bg-green-50" : "text-gray-400 hover:bg-gray-50"}`}>
                    {item.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                  <button onClick={() => openEdit(item)} className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg"><Edit className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(item.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
