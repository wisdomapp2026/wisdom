import { useState } from "react";
import { X } from "lucide-react";
import { createTopic } from "@shared/repositories";
import type { Topic } from "@shared/types";
import LoadingButton from "./LoadingButton";

interface Props {
  open: boolean;
  courseId: string;
  existingCount: number;
  folderId?: string; // qaysi papkaga qo'shilmoqda
  onClose: () => void;
  onCreated: () => void;
}

export default function CreateTopicModal({ open, courseId, existingCount, folderId, onClose, onCreated }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const order = existingCount + 1;
    const id = `topic-${Date.now()}`;
    const now = Date.now();

    const topic: Topic = {
      id,
      courseId,
      ...(folderId ? { folderId } : {}),
      title: title,
      description,
      icon: "📖",
      order,
      isPremium,
      createdAt: now,
      updatedAt: now,
    };

    try {
      await createTopic(courseId, topic);
      onCreated();
      onClose();
      setTitle("");
      setDescription("");
    } catch (err) {
      console.error("Mavzu yaratishda xatolik:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Yangi mavzu qo'shish</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mavzu nomi *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Masalan: Kasrlar"
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            />
            <p className="text-xs text-gray-400 mt-1">Mavzu nomi kiritilganidek saqlanadi</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tavsif</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Bu mavzuda nimalar o'rganiladi..."
              rows={2}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm resize-none"
            />
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="topicPremium"
              checked={isPremium}
              onChange={(e) => setIsPremium(e.target.checked)}
              className="w-4 h-4 text-primary-500 rounded"
            />
            <label htmlFor="topicPremium" className="text-sm text-gray-700">Premium mavzu</label>
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-100">
            <button type="button" onClick={onClose} className="flex-1 btn-outline">Bekor</button>
            <LoadingButton type="submit" loading={loading} disabled={!title} className="flex-1 btn-primary">
              Qo'shish
            </LoadingButton>
          </div>
        </form>
      </div>
    </div>
  );
}
