import { useState, useEffect, useRef } from "react";
import { Plus, Edit, Trash2, Eye, EyeOff, X, GripVertical } from "lucide-react";
import { getAllBanners, createBanner, updateBanner, deleteBanner, getAllCourses } from "@shared/repositories";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@shared/firebase";
import type { HomeBanner, Course } from "@shared/types";
import LoadingButton from "../components/LoadingButton";

export default function Banners() {
  const [banners, setBanners] = useState<HomeBanner[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editBanner, setEditBanner] = useState<HomeBanner | null>(null);

  // Form fields
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [buttonText, setButtonText] = useState("Boshlash");
  const [courseId, setCourseId] = useState("");
  const [bgColor, setBgColor] = useState("#3b82f6");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [imagePosition, setImagePosition] = useState("center");
  const [imageFit, setImageFit] = useState<"cover" | "contain">("cover");
  const [imageFullWidth, setImageFullWidth] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const [b, c] = await Promise.all([getAllBanners(), getAllCourses()]);
    setBanners(b);
    setCourses(c);
    setLoading(false);
  }

  function openCreate() {
    setEditBanner(null);
    setTitle(""); setSubtitle(""); setButtonText("Boshlash"); setCourseId(""); setBgColor("#3b82f6");
    setImageFile(null); setImagePreview(""); setImagePosition("center"); setImageFit("cover"); setImageFullWidth(false);
    setShowForm(true);
  }

  function openEdit(banner: HomeBanner) {
    setEditBanner(banner);
    setTitle(banner.title); setSubtitle(banner.subtitle || ""); setButtonText(banner.buttonText);
    setCourseId(banner.courseId || ""); setBgColor(banner.bgColor || "#3b82f6");
    setImagePreview(banner.imageUrl || ""); setImageFile(null);
    setImagePosition(banner.imagePosition || "center"); setImageFit(banner.imageFit || "cover");
    setImageFullWidth(banner.imageFullWidth || false);
    setShowForm(true);
  }

  async function handleSave() {
    if (!title.trim() || !buttonText.trim()) return;
    setSaving(true);
    const now = Date.now();

    let imageUrl = editBanner?.imageUrl || "";
    if (imageFile) {
      const storageRef = ref(storage, `banners/${now}-${imageFile.name}`);
      await uploadBytes(storageRef, imageFile);
      imageUrl = await getDownloadURL(storageRef);
    }

    try {
      if (editBanner) {
        await updateBanner(editBanner.id, {
          title: title.trim(), subtitle: subtitle.trim(), buttonText: buttonText.trim(),
          courseId: courseId || undefined, bgColor, imageUrl: imageUrl || undefined,
          imagePosition, imageFit, imageFullWidth,
        });
      } else {
        const banner: HomeBanner = {
          id: `banner-${now}`, title: title.trim(), subtitle: subtitle.trim(),
          buttonText: buttonText.trim(), courseId: courseId || undefined,
          bgColor, imageUrl: imageUrl || undefined,
          imagePosition, imageFit, imageFullWidth,
          isActive: true, order: banners.length + 1,
          createdAt: now, updatedAt: now,
        };
        await createBanner(banner);
      }
      setShowForm(false);
      await loadData();
    } catch (err) {
      console.error("Banner saqlashda xatolik:", err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Bu bannerni o'chirishga ishonchingiz komilmi?")) return;
    await deleteBanner(id);
    await loadData();
  }

  async function handleToggle(banner: HomeBanner) {
    await updateBanner(banner.id, { isActive: !banner.isActive });
    await loadData();
  }

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-3 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bannerlar</h1>
          <p className="text-gray-500 mt-1">Bosh sahifadagi karusel bannerlarini boshqarish</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Yangi banner
        </button>
      </div>

      {/* Banner form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-primary-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-gray-900">{editBanner ? "Bannerni tahrirlash" : "Yangi banner yaratish"}</h3>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sarlavha *</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Milliy sertifikatga tayyormisiz?" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kichik matn</label>
              <input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="Ixtiyoriy qo'shimcha matn" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tugma matni *</label>
              <input value={buttonText} onChange={(e) => setButtonText(e.target.value)} placeholder="Boshlash" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kursga yo'naltirish</label>
              <select value={courseId} onChange={(e) => setCourseId(e.target.value)} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm">
                <option value="">Tanlanmagan</option>
                {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fon rangi</label>
              <div className="flex items-center gap-2">
                <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer" />
                <input value={bgColor} onChange={(e) => setBgColor(e.target.value)} className="flex-1 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rasm (ixtiyoriy)</label>
              <div className="flex items-center gap-2">
                {imagePreview && <img src={imagePreview} alt="" className="h-10 rounded-lg border" />}
                <label className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 cursor-pointer hover:bg-gray-50">
                  📷 Tanlash
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setImageFile(f); setImagePreview(URL.createObjectURL(f)); } }} />
                </label>
              </div>
            </div>
          </div>

          {/* Rasm pozitsiyasi sozlamalari */}
          {imagePreview && (
            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
              <h4 className="text-sm font-medium text-gray-700">Rasm sozlamalari</h4>

              {/* To'liq yoyish toggle */}
              <div className="flex items-center justify-between bg-white rounded-lg border border-gray-200 px-3 py-2.5">
                <div>
                  <p className="text-sm font-medium text-gray-700">Rasmni banner bo'ylab yoyish</p>
                  <p className="text-[10px] text-gray-400">Fon sifatida to'liq banner'ni qoplaydi (matn ustida ko'rinadi)</p>
                </div>
                <button
                  type="button"
                  onClick={() => setImageFullWidth(!imageFullWidth)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${imageFullWidth ? "bg-primary-500" : "bg-gray-300"}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${imageFullWidth ? "translate-x-5" : ""}`} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Qaysi qismi ko'rinsin</label>
                  <div className="grid grid-cols-3 gap-1">
                    {["top left", "top center", "top right", "center left", "center", "center right", "bottom left", "bottom center", "bottom right"].map((pos) => (
                      <button
                        key={pos}
                        type="button"
                        onClick={() => setImagePosition(pos)}
                        className={`px-1 py-1.5 text-[10px] rounded border text-center ${imagePosition === pos ? "border-primary-400 bg-primary-50 text-primary-700 font-medium" : "border-gray-200 text-gray-500 hover:bg-gray-100"}`}
                      >
                        {pos.replace("center", "O'rta").replace("top", "Yuqori").replace("bottom", "Pastki").replace("left", "Chap").replace("right", "O'ng")}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Rasm o'lchami</label>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setImageFit("cover")} className={`flex-1 px-3 py-2 text-xs rounded-lg border ${imageFit === "cover" ? "border-primary-400 bg-primary-50 text-primary-700 font-medium" : "border-gray-200 text-gray-500"}`}>
                      Cover (to'liq)
                    </button>
                    <button type="button" onClick={() => setImageFit("contain")} className={`flex-1 px-3 py-2 text-xs rounded-lg border ${imageFit === "contain" ? "border-primary-400 bg-primary-50 text-primary-700 font-medium" : "border-gray-200 text-gray-500"}`}>
                      Contain (sig'adi)
                    </button>
                  </div>
                </div>
              </div>

              {/* Tavsiya o'lchami */}
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                <p className="text-xs text-blue-700 font-medium">📐 Tavsiya etiladigan rasm o'lchami:</p>
                <p className="text-xs text-blue-600 mt-1">• To'liq yoyish uchun: <strong>800×200 px</strong> (4:1 nisbat)</p>
                <p className="text-xs text-blue-600">• O'ng tomonda ko'rsatish uchun: <strong>300×200 px</strong></p>
                <p className="text-xs text-blue-600">• Banner balandligi: ~130 px (mobilda), ~150 px (desktop)</p>
              </div>
            </div>
          )}

          {/* Preview — rasm pozitsiyasini drag qilib o'zgartirish */}
          <div>
            <p className="text-xs text-gray-500 mb-2">Ko'rinishi: <span className="text-gray-400">(rasmni sichqoncha bilan sudrab joylang)</span></p>
            <BannerPreviewDraggable
              title={title}
              subtitle={subtitle}
              buttonText={buttonText}
              bgColor={bgColor}
              imagePreview={imagePreview}
              imageFullWidth={imageFullWidth}
              imageFit={imageFit}
              imagePosition={imagePosition}
              onPositionChange={setImagePosition}
            />
          </div>

          <div className="flex gap-3">
            <LoadingButton onClick={handleSave} disabled={!title.trim()} className="btn-primary">
              {editBanner ? "Saqlash" : "Yaratish"}
            </LoadingButton>
            <button onClick={() => setShowForm(false)} className="btn-outline">Bekor</button>
          </div>
        </div>
      )}

      {/* Bannerlar ro'yxati */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {banners.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-4xl mb-3">🖼️</p>
            <p>Hali banner yaratilmagan</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {banners.map((banner) => (
              <div key={banner.id} className={`flex items-center gap-4 p-4 ${!banner.isActive ? "opacity-50" : ""}`}>
                <GripVertical className="w-4 h-4 text-gray-300 shrink-0" />
                <div className="w-16 h-10 rounded-lg shrink-0 flex items-center justify-center text-white text-xs font-bold overflow-hidden relative" style={{ backgroundColor: banner.bgColor }}>
                  {banner.imageUrl && <img src={banner.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-60" />}
                  <span className="relative z-10 truncate px-1">{banner.order}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm truncate">{banner.title}</p>
                  <p className="text-xs text-gray-500">Tugma: "{banner.buttonText}" → {banner.courseId ? courses.find(c => c.id === banner.courseId)?.title || banner.courseId : "Link yo'q"}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <LoadingButton onClick={() => handleToggle(banner)} className={`p-1.5 rounded-lg ${banner.isActive ? "text-green-600 hover:bg-green-50" : "text-gray-400 hover:bg-gray-50"}`} title={banner.isActive ? "Faol" : "Nofaol"} iconOnly>
                    {banner.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </LoadingButton>
                  <button onClick={() => openEdit(banner)} className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all active:scale-95"><Edit className="w-4 h-4" /></button>
                  <LoadingButton onClick={() => handleDelete(banner.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg" iconOnly><Trash2 className="w-4 h-4" /></LoadingButton>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


// ===== Drag bilan rasm pozitsiyasini o'zgartirish =====
function BannerPreviewDraggable({
  title, subtitle, buttonText, bgColor, imagePreview, imageFullWidth, imageFit, imagePosition, onPositionChange,
}: {
  title: string; subtitle: string; buttonText: string; bgColor: string;
  imagePreview: string; imageFullWidth: boolean; imageFit: "cover" | "contain";
  imagePosition: string; onPositionChange: (pos: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  // imagePosition ni x%, y% formatga parse qilish
  function parsePosition(pos: string): { x: number; y: number } {
    const map: Record<string, { x: number; y: number }> = {
      "top left": { x: 0, y: 0 }, "top center": { x: 50, y: 0 }, "top right": { x: 100, y: 0 },
      "center left": { x: 0, y: 50 }, "center": { x: 50, y: 50 }, "center right": { x: 100, y: 50 },
      "bottom left": { x: 0, y: 100 }, "bottom center": { x: 50, y: 100 }, "bottom right": { x: 100, y: 100 },
    };
    if (map[pos]) return map[pos];
    // "x% y%" formatini parse qilish
    const match = pos.match(/(\d+)%?\s+(\d+)%?/);
    if (match) return { x: parseInt(match[1]), y: parseInt(match[2]) };
    return { x: 50, y: 50 };
  }

  function handleMouseDown(e: React.MouseEvent) {
    if (!imagePreview) return;
    e.preventDefault();
    setDragging(true);
    updatePosition(e.clientX, e.clientY);
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!dragging) return;
    updatePosition(e.clientX, e.clientY);
  }

  function handleMouseUp() {
    setDragging(false);
  }

  function handleTouchStart(e: React.TouchEvent) {
    if (!imagePreview) return;
    setDragging(true);
    const touch = e.touches[0];
    updatePosition(touch.clientX, touch.clientY);
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (!dragging) return;
    const touch = e.touches[0];
    updatePosition(touch.clientX, touch.clientY);
  }

  function updatePosition(clientX: number, clientY: number) {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, Math.round(((clientX - rect.left) / rect.width) * 100)));
    const y = Math.max(0, Math.min(100, Math.round(((clientY - rect.top) / rect.height) * 100)));
    onPositionChange(`${x}% ${y}%`);
  }

  const pos = parsePosition(imagePosition);

  return (
    <div
      ref={containerRef}
      className={`rounded-2xl p-5 text-white relative overflow-hidden select-none ${dragging ? "cursor-grabbing" : imagePreview ? "cursor-grab" : ""}`}
      style={{ backgroundColor: bgColor }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={() => setDragging(false)}
    >
      {imagePreview && !imageFullWidth && (
        <img src={imagePreview} alt="" className="absolute right-0 top-0 h-full w-1/3 pointer-events-none" style={{ objectFit: imageFit, objectPosition: imagePosition, opacity: 0.6 }} />
      )}
      {imagePreview && imageFullWidth && (
        <img src={imagePreview} alt="" className="absolute inset-0 w-full h-full pointer-events-none" style={{ objectFit: imageFit, objectPosition: imagePosition, opacity: 0.7 }} />
      )}
      {/* Pozitsiya indikatori */}
      {imagePreview && (
        <div
          className="absolute w-4 h-4 bg-white rounded-full border-2 border-primary-500 shadow-lg z-20 pointer-events-none"
          style={{ left: `${pos.x}%`, top: `${pos.y}%`, transform: "translate(-50%, -50%)" }}
        />
      )}
      {/* Matn */}
      <p className="text-xl font-bold relative z-10 pointer-events-none">{title || "Sarlavha"}</p>
      {subtitle && <p className="text-sm text-white/80 mt-1 relative z-10 pointer-events-none">{subtitle}</p>}
      <div className="mt-3 inline-block bg-gray-900 text-white text-sm font-semibold px-4 py-2 rounded-xl relative z-10 pointer-events-none">{buttonText || "Tugma"}</div>
      {/* Pozitsiya qiymati ko'rsatish */}
      {imagePreview && (
        <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] px-2 py-1 rounded z-20 pointer-events-none font-mono">
          {imagePosition}
        </div>
      )}
    </div>
  );
}
