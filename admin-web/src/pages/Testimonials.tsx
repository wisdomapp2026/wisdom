import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Eye, EyeOff, X, Star, Quote, User as UserIcon } from "lucide-react";
import { getAllTestimonials, createTestimonial, updateTestimonial, deleteTestimonial } from "@shared/repositories";
import { uploadFile } from "@shared/supabase";
import type { Testimonial } from "@shared/types";
import LoadingButton from "../components/LoadingButton";

export default function Testimonials() {
  const [items, setItems] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<Testimonial | null>(null);

  // Form fields
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [text, setText] = useState("");
  const [rating, setRating] = useState(5);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const data = await getAllTestimonials();
    setItems(data);
    setLoading(false);
  }

  function openCreate() {
    setEditItem(null);
    setName(""); setRole(""); setText(""); setRating(5);
    setAvatarFile(null); setAvatarPreview("");
    setShowForm(true);
  }

  function openEdit(item: Testimonial) {
    setEditItem(item);
    setName(item.name); setRole(item.role || ""); setText(item.text); setRating(item.rating || 5);
    setAvatarPreview(item.avatarUrl || ""); setAvatarFile(null);
    setShowForm(true);
  }

  async function handleSave() {
    if (!name.trim() || !text.trim()) return;
    setSaving(true);
    const now = Date.now();

    let avatarUrl = editItem?.avatarUrl || "";
    if (avatarFile) {
      try {
        avatarUrl = await uploadFile("edukids", `testimonials/${now}-${avatarFile.name}`, avatarFile);
      } catch (err: any) {
        console.error("Avatar yuklashda xatolik:", err);
      }
    }

    try {
      if (editItem) {
        await updateTestimonial(editItem.id, {
          name: name.trim(), role: role.trim() || undefined, text: text.trim(),
          rating, avatarUrl: avatarUrl || undefined,
        });
      } else {
        const testimonial: Testimonial = {
          id: `testimonial-${now}`, name: name.trim(), role: role.trim() || undefined,
          text: text.trim(), rating, avatarUrl: avatarUrl || undefined,
          isActive: true, order: items.length + 1,
          createdAt: now, updatedAt: now,
        };
        await createTestimonial(testimonial);
      }
      setShowForm(false);
      await loadData();
    } catch (err) {
      console.error("Otziv saqlashda xatolik:", err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Bu otzivni o'chirishga ishonchingiz komilmi?")) return;
    await deleteTestimonial(id);
    await loadData();
  }

  async function handleToggle(item: Testimonial) {
    await updateTestimonial(item.id, { isActive: !item.isActive });
    await loadData();
  }

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-3 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Otzivlar</h1>
          <p className="text-gray-500 mt-1">Bosh sahifadagi foydalanuvchi otzivlari va reytinglarini boshqarish</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Yangi otziv
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-primary-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-gray-900">{editItem ? "Otzivni tahrirlash" : "Yangi otziv yaratish"}</h3>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Avatar */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Foydalanuvchi rasmi</label>
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-full overflow-hidden bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon className="w-6 h-6 text-gray-300" />
                  )}
                </div>
                <label className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 cursor-pointer hover:bg-gray-50">
                  📷 Rasm tanlash
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setAvatarFile(f); setAvatarPreview(URL.createObjectURL(f)); } }} />
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ism *</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Dilnoza Karimova" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tavsif (ixtiyoriy)</label>
              <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Matematika kursi o'quvchisi" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm" />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Otziv matni *</label>
              <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="EduKids bilan matematikani yaxshi tushunib oldim..." rows={3} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm resize-none" required />
            </div>

            {/* Reyting */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Reyting bali</label>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button key={star} type="button" onClick={() => setRating(star)} className="transition-transform active:scale-90">
                    <Star
                      className={`w-7 h-7 ${star <= rating ? "text-yellow-400 fill-yellow-400" : "text-gray-200 fill-gray-200"}`}
                    />
                  </button>
                ))}
                <span className="text-sm font-medium text-gray-500 ml-2">{rating}/5</span>
              </div>
            </div>
          </div>

          {/* Preview — zamonaviy card ko'rinishi */}
          <div>
            <p className="text-xs text-gray-500 mb-2">Ko'rinishi:</p>
            <TestimonialPreviewCard name={name} role={role} text={text} rating={rating} avatarUrl={avatarPreview} />
          </div>

          <div className="flex gap-3">
            <LoadingButton onClick={handleSave} disabled={!name.trim() || !text.trim()} className="btn-primary">
              {editItem ? "Saqlash" : "Yaratish"}
            </LoadingButton>
            <button onClick={() => setShowForm(false)} className="btn-outline">Bekor</button>
          </div>
        </div>
      )}

      {/* Ro'yxat */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {items.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-4xl mb-3">💬</p>
            <p>Hali otziv qo'shilmagan</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {items.map((item) => (
              <div key={item.id} className={`flex items-center gap-4 p-4 ${!item.isActive ? "opacity-50" : ""}`}>
                <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-100 shrink-0 flex items-center justify-center border border-gray-200">
                  {item.avatarUrl ? (
                    <img src={item.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon className="w-5 h-5 text-gray-300" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900 text-sm truncate">{item.name}</p>
                    <div className="flex items-center gap-0.5 shrink-0">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} className={`w-3 h-3 ${s <= item.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-200 fill-gray-200"}`} />
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 truncate mt-0.5">{item.text}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <LoadingButton onClick={() => handleToggle(item)} className={`p-1.5 rounded-lg ${item.isActive ? "text-green-600 hover:bg-green-50" : "text-gray-400 hover:bg-gray-50"}`} title={item.isActive ? "Faol" : "Nofaol"} iconOnly>
                    {item.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </LoadingButton>
                  <button onClick={() => openEdit(item)} className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all active:scale-95"><Edit className="w-4 h-4" /></button>
                  <LoadingButton onClick={() => handleDelete(item.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg" iconOnly><Trash2 className="w-4 h-4" /></LoadingButton>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ===== Zamonaviy otziv preview kartasi =====
function TestimonialPreviewCard({ name, role, text, rating, avatarUrl }: {
  name: string; role: string; text: string; rating: number; avatarUrl: string;
}) {
  return (
    <div className="relative bg-gradient-to-br from-primary-50 to-white border border-primary-100 rounded-2xl p-5 max-w-sm">
      <Quote className="absolute top-4 right-4 w-8 h-8 text-primary-100" />
      <div className="flex items-center gap-0.5 mb-3">
        {[1, 2, 3, 4, 5].map((s) => (
          <Star key={s} className={`w-4 h-4 ${s <= rating ? "text-yellow-400 fill-yellow-400" : "text-gray-200 fill-gray-200"}`} />
        ))}
      </div>
      <p className="text-sm text-gray-700 leading-relaxed relative z-10">"{text || "Otziv matni bu yerda ko'rinadi..."}"</p>
      <div className="flex items-center gap-3 mt-4">
        <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 border-2 border-white shadow shrink-0">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-primary-500 text-white text-sm font-bold">
              {(name || "?").charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">{name || "Foydalanuvchi ismi"}</p>
          {role && <p className="text-[11px] text-gray-500">{role}</p>}
        </div>
      </div>
    </div>
  );
}
