import { useState, useEffect } from "react";
import { X, Plus, Pencil, Trash2, Check } from "lucide-react";
import { createCourse, getAllCategories, createCategory, updateCategory, deleteCategory } from "@shared/repositories";
import type { Course, Category, CourseIntroduction } from "@shared/types";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export default function CreateCourseModal({ open, onClose, onCreated }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [isPremium, setIsPremium] = useState(false);
  const [testAfterEvery, setTestAfterEvery] = useState(10);
  const [loading, setLoading] = useState(false);

  // Kategoriya boshqaruvi
  const [categories, setCategories] = useState<Category[]>([]);
  const [catLoading, setCatLoading] = useState(false);
  const [showCatManager, setShowCatManager] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingCatName, setEditingCatName] = useState("");

  // Kategoriyalarni yuklash
  useEffect(() => {
    if (open) {
      loadCategories();
    }
  }, [open]);

  async function loadCategories() {
    setCatLoading(true);
    try {
      const cats = await getAllCategories();
      setCategories(cats);
      if (cats.length > 0 && !category) {
        setCategory(cats[0].name);
      }
    } catch (err) {
      console.error("Kategoriyalarni yuklashda xatolik:", err);
    } finally {
      setCatLoading(false);
    }
  }

  // Yangi kategoriya yaratish
  async function handleAddCategory() {
    const name = newCatName.trim();
    if (!name) return;
    // Dublikat tekshirish
    if (categories.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
      alert("Bu kategoriya allaqachon mavjud!");
      return;
    }
    const id = name.toLowerCase().replace(/[^a-z0-9\u0400-\u04ff]/g, "-").replace(/-+/g, "-");
    const cat: Category = {
      id,
      name,
      order: categories.length + 1,
      createdAt: Date.now(),
    };
    try {
      await createCategory(cat);
      setNewCatName("");
      await loadCategories();
      setCategory(name);
    } catch (err) {
      console.error("Kategoriya yaratishda xatolik:", err);
    }
  }

  // Kategoriyani tahrirlash
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
      if (oldCat && category === oldCat.name) {
        setCategory(name);
      }
      await loadCategories();
    } catch (err) {
      console.error("Kategoriya tahrirlashda xatolik:", err);
    }
  }

  // Kategoriyani o'chirish
  async function handleDeleteCategory(catId: string) {
    const cat = categories.find((c) => c.id === catId);
    if (!cat) return;
    if (!confirm(`"${cat.name}" kategoriyasini o'chirmoqchimisiz?`)) return;
    try {
      await deleteCategory(catId);
      if (category === cat.name) {
        setCategory("");
      }
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

    const id = title.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
    const now = Date.now();

    const course: Course = {
      id,
      title,
      description,
      category,
      isPremium,
      testAfterEvery,
      coverImage: "",
      totalStudents: 0,
      onlineNow: 0,
      tags: [category],
      order: now,
      introduction: {
        text: description || "Bu kursda nimalar o'rganiladi va kurs qanday tuzilgan haqida qisqacha ma'lumot.",
        videoUrl: "",
        videoType: "youtube",
        thumbnailUrl: "",
      },
      createdAt: now,
      updatedAt: now,
      createdBy: "admin",
    };

    try {
      await createCourse(course);
      onCreated();
      onClose();
      setTitle("");
      setDescription("");
      setCategory(categories.length > 0 ? categories[0].name : "");
    } catch (err) {
      console.error("Kurs yaratishda xatolik:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Yangi kurs yaratish</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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

          <div className="grid grid-cols-2 gap-4">
            {/* Kategoriya */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">Kategoriya *</label>
                <button
                  type="button"
                  onClick={() => setShowCatManager(!showCatManager)}
                  className="text-xs text-primary-500 hover:text-primary-700 font-medium"
                >
                  {showCatManager ? "Yopish" : "Boshqarish"}
                </button>
              </div>
              {catLoading ? (
                <div className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-400">
                  Yuklanmoqda...
                </div>
              ) : (
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                  required
                >
                  <option value="">— Tanlang —</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.name}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Test har nechta darsdan keyin</label>
              <input
                type="number"
                value={testAfterEvery}
                onChange={(e) => setTestAfterEvery(Number(e.target.value))}
                min={0}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm"
              />
              <p className="text-xs text-gray-400 mt-1">0 = faqat kurs oxirida</p>
            </div>
          </div>

          {/* Kategoriya boshqarish paneli */}
          {showCatManager && (
            <div className="border border-gray-200 rounded-xl p-4 bg-gray-50 space-y-3">
              <h4 className="text-sm font-semibold text-gray-700">Kategoriyalarni boshqarish</h4>

              {/* Yangi kategoriya qo'shish */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="Yangi kategoriya nomi..."
                  className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddCategory();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={handleAddCategory}
                  disabled={!newCatName.trim()}
                  className="px-3 py-2 bg-primary-500 text-white rounded-lg text-sm hover:bg-primary-600 disabled:opacity-50 flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  Qo'shish
                </button>
              </div>

              {/* Mavjud kategoriyalar ro'yxati */}
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {categories.length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-2">
                    Hali kategoriya yo'q. Yangi qo'shing.
                  </p>
                )}
                {categories.map((cat) => (
                  <div
                    key={cat.id}
                    className="flex items-center gap-2 bg-white border border-gray-100 rounded-lg px-3 py-2"
                  >
                    {editingCatId === cat.id ? (
                      <>
                        <input
                          type="text"
                          value={editingCatName}
                          onChange={(e) => setEditingCatName(e.target.value)}
                          className="flex-1 px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleUpdateCategory(cat.id);
                            }
                            if (e.key === "Escape") {
                              setEditingCatId(null);
                            }
                          }}
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => handleUpdateCategory(cat.id)}
                          className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                          title="Saqlash"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingCatId(null)}
                          className="p-1.5 text-gray-400 hover:bg-gray-100 rounded"
                          title="Bekor qilish"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="flex-1 text-sm text-gray-700">{cat.name}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCatId(cat.id);
                            setEditingCatName(cat.name);
                          }}
                          className="p-1.5 text-gray-400 hover:text-primary-500 hover:bg-primary-50 rounded"
                          title="Tahrirlash"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCategory(cat.id)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                          title="O'chirish"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isPremium"
              checked={isPremium}
              onChange={(e) => setIsPremium(e.target.checked)}
              className="w-4 h-4 text-primary-500 rounded"
            />
            <label htmlFor="isPremium" className="text-sm text-gray-700">
              Premium kurs (obuna talab etiladi)
            </label>
          </div>

          <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
            <button type="button" onClick={onClose} className="flex-1 btn-outline">
              Bekor qilish
            </button>
            <button type="submit" disabled={loading || !title || !category} className="flex-1 btn-primary disabled:opacity-50">
              {loading ? "Yaratilmoqda..." : "Kursni yaratish"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
