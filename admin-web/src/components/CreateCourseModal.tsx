import { useState, useEffect, useRef } from "react";
import { X, Plus, Pencil, Trash2, Check, ImageIcon } from "lucide-react";
import { createCourse, updateCourse, getAllCategories, createCategory, updateCategory, deleteCategory } from "@shared/repositories";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@shared/firebase";
import type { Course, Category } from "@shared/types";
import LoadingButton from "./LoadingButton";

interface Props {
  open: boolean;
  editCourse?: Course | null;
  onClose: () => void;
  onCreated: () => void;
}

export default function CreateCourseModal({ open, editCourse, onClose, onCreated }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(false);

  // Cover image
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState("");
  const [coverPosition, setCoverPosition] = useState("50% 50%");
  const [coverFit, setCoverFit] = useState<"cover" | "contain">("cover");

  // Kategoriya boshqaruvi
  const [categories, setCategories] = useState<Category[]>([]);
  const [catLoading, setCatLoading] = useState(false);
  const [showCatManager, setShowCatManager] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingCatName, setEditingCatName] = useState("");

  const isEditMode = !!editCourse;

  // Modal ochilganda formni to'ldirish
  useEffect(() => {
    if (open) {
      loadCategories();
      if (editCourse) {
        setTitle(editCourse.title);
        setDescription(editCourse.description);
        setCategory(editCourse.category);
        setIsPremium(editCourse.isPremium);
        setCoverPreview(editCourse.coverImage || "");
        setCoverPosition(editCourse.coverPosition || "50% 50%");
        setCoverFit(editCourse.coverFit || "cover");
        setCoverFile(null);
      } else {
        setTitle("");
        setDescription("");
        setIsPremium(false);
        setCoverFile(null);
        setCoverPreview("");
        setCoverPosition("50% 50%");
        setCoverFit("cover");
      }
    }
  }, [open, editCourse]);

  async function loadCategories() {
    setCatLoading(true);
    try {
      const cats = await getAllCategories();
      setCategories(cats);
      if (cats.length > 0 && !category && !editCourse) {
        setCategory(cats[0].name);
      }
    } catch (err) {
      console.error("Kategoriyalarni yuklashda xatolik:", err);
    } finally {
      setCatLoading(false);
    }
  }

  async function handleAddCategory() {
    const name = newCatName.trim();
    if (!name) return;
    if (categories.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
      alert("Bu kategoriya allaqachon mavjud!");
      return;
    }
    const id = name.toLowerCase().replace(/[^a-z0-9\u0400-\u04ff]/g, "-").replace(/-+/g, "-");
    const cat: Category = { id, name, order: categories.length + 1, createdAt: Date.now() };
    try {
      await createCategory(cat);
      setNewCatName("");
      await loadCategories();
      setCategory(name);
    } catch (err) {
      console.error("Kategoriya yaratishda xatolik:", err);
    }
  }

  async function handleUpdateCategory(catId: string) {
    const name = editingCatName.trim();
    if (!name) return;
    if (categories.some((c) => c.id !== catId && c.name.toLowerCase() === name.toLowerCase())) {
      alert("Bu nomdagi kategoriya allaqachon mavjud!");
      return;
    }
    try {
      await updateCategory(catId, { name });
      setEditingCatId(null);
      setEditingCatName("");
      const oldCat = categories.find((c) => c.id === catId);
      if (oldCat && category === oldCat.name) setCategory(name);
      await loadCategories();
    } catch (err) {
      console.error("Kategoriya tahrirlashda xatolik:", err);
    }
  }

  async function handleDeleteCategory(catId: string) {
    const cat = categories.find((c) => c.id === catId);
    if (!cat) return;
    if (!confirm(`"${cat.name}" kategoriyasini o'chirmoqchimisiz?`)) return;
    try {
      await deleteCategory(catId);
      if (category === cat.name) setCategory("");
      await loadCategories();
    } catch (err) {
      console.error("Kategoriya o'chirishda xatolik:", err);
    }
  }

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!category) {
      alert("Iltimos, kategoriya tanlang!");
      return;
    }
    setLoading(true);

    const now = Date.now();

    // Cover image upload
    let coverImage = isEditMode ? (editCourse!.coverImage || "") : "";
    if (coverFile) {
      try {
        const courseId = isEditMode ? editCourse!.id : title.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
        const storageRef = ref(storage, `courses/${courseId}/cover-${now}-${coverFile.name}`);
        await uploadBytes(storageRef, coverFile);
        coverImage = await getDownloadURL(storageRef);
      } catch (err) {
        console.error("Muqova yuklashda xatolik:", err);
      }
    }
    if (!coverPreview && !coverFile) {
      coverImage = "";
    }

    try {
      if (isEditMode) {
        await updateCourse(editCourse!.id, {
          title, description, category, isPremium, coverImage,
          coverPosition, coverFit, tags: [category],
        });
      } else {
        const slug = title.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
        const id = `${slug}-${Date.now().toString(36)}`;
        const course: Course = {
          id, title, description, category, isPremium,
          testAfterEvery: 0, coverImage, coverPosition, coverFit,
          totalStudents: 0, onlineNow: 0, tags: [category], order: now,
          introduction: {
            text: description || "Bu kursda nimalar o'rganiladi va kurs qanday tuzilgan haqida qisqacha ma'lumot.",
            videoUrl: "", videoType: "youtube", thumbnailUrl: "",
          },
          createdAt: now, updatedAt: now, createdBy: "admin",
        };
        await createCourse(course);
      }
      onCreated();
      onClose();
    } catch (err) {
      console.error(isEditMode ? "Kurs yangilashda xatolik:" : "Kurs yaratishda xatolik:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">
            {isEditMode ? "Kursni tahrirlash" : "Yangi kurs yaratish"}
          </h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Muqova rasmi */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kurs muqovasi</label>
            {coverPreview ? (
              <div className="space-y-3">
                {/* Preview + drag */}
                <CoverPreviewDraggable
                  imageUrl={coverPreview}
                  position={coverPosition}
                  fit={coverFit}
                  onPositionChange={setCoverPosition}
                />
                {/* Sozlamalar */}
                <div className="flex items-center gap-2">
                  {/* Fit toggle */}
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setCoverFit("cover")}
                      className={`px-3 py-1.5 text-xs rounded-lg border font-medium ${coverFit === "cover" ? "border-primary-400 bg-primary-50 text-primary-700" : "border-gray-200 text-gray-500 hover:bg-gray-50"}`}
                    >
                      Cover (to'liq)
                    </button>
                    <button
                      type="button"
                      onClick={() => setCoverFit("contain")}
                      className={`px-3 py-1.5 text-xs rounded-lg border font-medium ${coverFit === "contain" ? "border-primary-400 bg-primary-50 text-primary-700" : "border-gray-200 text-gray-500 hover:bg-gray-50"}`}
                    >
                      Contain (sig'adi)
                    </button>
                  </div>
                  <div className="flex-1" />
                  {/* Almashtirish */}
                  <label className="w-8 h-8 bg-gray-100 border border-gray-200 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-200 cursor-pointer" title="Rasmni almashtirish">
                    <Pencil className="w-3.5 h-3.5" />
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setCoverFile(file);
                          setCoverPreview(URL.createObjectURL(file));
                          setCoverPosition("50% 50%");
                        }
                      }}
                    />
                  </label>
                  {/* O'chirish */}
                  <button
                    type="button"
                    onClick={() => { setCoverFile(null); setCoverPreview(""); setCoverPosition("50% 50%"); }}
                    className="w-8 h-8 bg-gray-100 border border-gray-200 rounded-lg flex items-center justify-center text-gray-500 hover:text-red-500 hover:bg-red-50"
                    title="Rasmni o'chirish"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-[10px] text-gray-400">💡 Rasmni sichqoncha bilan sudrab ko'rinadigan qismini tanlang</p>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center h-36 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-primary-400 hover:bg-primary-50/30 transition-colors">
                <ImageIcon className="w-8 h-8 text-gray-400 mb-2" />
                <span className="text-sm text-gray-500">Rasm tanlash (ixtiyoriy)</span>
                <span className="text-xs text-gray-400 mt-1">PNG, JPG — tavsiya: 800×400 px</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setCoverFile(file);
                      setCoverPreview(URL.createObjectURL(file));
                      setCoverPosition("50% 50%");
                    }
                  }}
                />
              </label>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kurs nomi *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Masalan: Algebra asoslari"
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tavsif</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Kurs haqida qisqacha..."
              rows={3}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            />
          </div>

          {/* Kategoriya */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">Kategoriya *</label>
              <button type="button" onClick={() => setShowCatManager(!showCatManager)} className="text-xs text-primary-500 hover:text-primary-700 font-medium">
                {showCatManager ? "Yopish" : "Boshqarish"}
              </button>
            </div>
            {catLoading ? (
              <div className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-400">Yuklanmoqda...</div>
            ) : (
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm" required>
                <option value="">— Tanlang —</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.name}>{cat.name}</option>
                ))}
              </select>
            )}
          </div>

          {/* Kategoriya boshqarish paneli */}
          {showCatManager && (
            <div className="border border-gray-200 rounded-xl p-4 bg-gray-50 space-y-3">
              <h4 className="text-sm font-semibold text-gray-700">Kategoriyalarni boshqarish</h4>
              <div className="flex gap-2">
                <input
                  type="text" value={newCatName} onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="Yangi kategoriya nomi..."
                  className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddCategory(); } }}
                />
                <button type="button" onClick={handleAddCategory} disabled={!newCatName.trim()} className="px-3 py-2 bg-primary-500 text-white rounded-lg text-sm hover:bg-primary-600 disabled:opacity-50 flex items-center gap-1">
                  <Plus className="w-4 h-4" /> Qo'shish
                </button>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {categories.length === 0 && <p className="text-xs text-gray-400 text-center py-2">Hali kategoriya yo'q. Yangi qo'shing.</p>}
                {categories.map((cat) => (
                  <div key={cat.id} className="flex items-center gap-2 bg-white border border-gray-100 rounded-lg px-3 py-2">
                    {editingCatId === cat.id ? (
                      <>
                        <input type="text" value={editingCatName} onChange={(e) => setEditingCatName(e.target.value)}
                          className="flex-1 px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleUpdateCategory(cat.id); } if (e.key === "Escape") setEditingCatId(null); }}
                          autoFocus
                        />
                        <button type="button" onClick={() => handleUpdateCategory(cat.id)} className="p-1.5 text-green-600 hover:bg-green-50 rounded"><Check className="w-4 h-4" /></button>
                        <button type="button" onClick={() => setEditingCatId(null)} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded"><X className="w-4 h-4" /></button>
                      </>
                    ) : (
                      <>
                        <span className="flex-1 text-sm text-gray-700">{cat.name}</span>
                        <button type="button" onClick={() => { setEditingCatId(cat.id); setEditingCatName(cat.name); }} className="p-1.5 text-gray-400 hover:text-primary-500 hover:bg-primary-50 rounded"><Pencil className="w-3.5 h-3.5" /></button>
                        <button type="button" onClick={() => handleDeleteCategory(cat.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <input type="checkbox" id="isPremium" checked={isPremium} onChange={(e) => setIsPremium(e.target.checked)} className="w-4 h-4 text-primary-500 rounded" />
            <label htmlFor="isPremium" className="text-sm text-gray-700">Premium kurs (obuna talab etiladi)</label>
          </div>

          <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
            <button type="button" onClick={onClose} className="flex-1 btn-outline">Bekor qilish</button>
            <LoadingButton type="submit" loading={loading} disabled={!title || !category} className="flex-1 btn-primary">
              {isEditMode ? "Saqlash" : "Kursni yaratish"}
            </LoadingButton>
          </div>
        </form>
      </div>
    </div>
  );
}


// ===== Rasm pozitsiyasini drag bilan o'zgartirish =====
function CoverPreviewDraggable({
  imageUrl, position, fit, onPositionChange,
}: {
  imageUrl: string; position: string; fit: "cover" | "contain";
  onPositionChange: (pos: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  function parsePosition(pos: string): { x: number; y: number } {
    const match = pos.match(/([\d.]+)%?\s+([\d.]+)%?/);
    if (match) return { x: parseFloat(match[1]), y: parseFloat(match[2]) };
    return { x: 50, y: 50 };
  }

  function updatePosition(clientX: number, clientY: number) {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, Math.round(((clientX - rect.left) / rect.width) * 100)));
    const y = Math.max(0, Math.min(100, Math.round(((clientY - rect.top) / rect.height) * 100)));
    onPositionChange(`${x}% ${y}%`);
  }

  function handleMouseDown(e: React.MouseEvent) {
    e.preventDefault();
    setDragging(true);
    updatePosition(e.clientX, e.clientY);
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!dragging) return;
    updatePosition(e.clientX, e.clientY);
  }

  function handleMouseUp() { setDragging(false); }

  function handleTouchStart(e: React.TouchEvent) {
    setDragging(true);
    updatePosition(e.touches[0].clientX, e.touches[0].clientY);
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (!dragging) return;
    updatePosition(e.touches[0].clientX, e.touches[0].clientY);
  }

  const pos = parsePosition(position);

  return (
    <div
      ref={containerRef}
      className={`relative h-40 rounded-xl overflow-hidden border border-gray-200 select-none ${dragging ? "cursor-grabbing ring-2 ring-primary-300" : "cursor-grab"}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={() => setDragging(false)}
    >
      <img
        src={imageUrl}
        alt="Cover preview"
        className="w-full h-full pointer-events-none"
        style={{ objectFit: fit, objectPosition: position }}
        draggable={false}
      />
      {/* Pozitsiya indikatori */}
      <div
        className="absolute w-4 h-4 bg-white rounded-full border-2 border-primary-500 shadow-lg z-10 pointer-events-none"
        style={{ left: `${pos.x}%`, top: `${pos.y}%`, transform: "translate(-50%, -50%)" }}
      />
      {/* Pozitsiya qiymati */}
      <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded z-10 pointer-events-none font-mono">
        {position}
      </div>
    </div>
  );
}
