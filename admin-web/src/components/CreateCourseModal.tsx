import { useState } from "react";
import { X } from "lucide-react";
import { createCourse } from "@shared/repositories";
import type { Course } from "@shared/types";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export default function CreateCourseModal({ open, onClose, onCreated }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Matematika");
  const [isPremium, setIsPremium] = useState(false);
  const [testAfterEvery, setTestAfterEvery] = useState(10);
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
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
    } catch (err) {
      console.error("Kurs yaratishda xatolik:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-xl">
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kategoriya</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm"
              >
                <option>Matematika</option>
                <option>Ona tili</option>
                <option>Ingliz tili</option>
                <option>Fizika</option>
                <option>Dasturlash</option>
                <option>Boshqa</option>
              </select>
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
            <button type="submit" disabled={loading || !title} className="flex-1 btn-primary disabled:opacity-50">
              {loading ? "Yaratilmoqda..." : "Kursni yaratish"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
