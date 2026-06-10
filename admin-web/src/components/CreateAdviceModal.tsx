import { useState } from "react";
import { X } from "lucide-react";
import { createAdvice } from "@shared/repositories";
import type { Advice, Topic } from "@shared/types";

interface Props {
  open: boolean;
  courseId: string;
  topics: Topic[];
  onClose: () => void;
  onCreated: () => void;
}

export default function CreateAdviceModal({ open, courseId, topics, onClose, onCreated }: Props) {
  const [title, setTitle] = useState("Maslahat");
  const [text, setText] = useState("");
  const [afterTopicOrder, setAfterTopicOrder] = useState(topics.length > 0 ? topics[0].order : 1);
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const now = Date.now();
    const id = `advice-${now}`;

    const advice: Advice = {
      id,
      courseId,
      title: title.trim() || "Maslahat",
      text: text.trim(),
      icon: "💡",
      afterTopicOrder,
      createdAt: now,
      updatedAt: now,
    };

    try {
      await createAdvice(courseId, advice);
      onCreated();
      onClose();
      setTitle("Maslahat");
      setText("");
    } catch (err) {
      console.error("Maslahat yaratishda xatolik:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Maslahat bloki qo'shish</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sarlavha</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Maslahat"
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Maslahat matni *</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="O'quvchilarga foydali maslahat yozing..."
              rows={4}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Qaysi mavzudan keyin joylashsin?</label>
            <select
              value={afterTopicOrder}
              onChange={(e) => setAfterTopicOrder(Number(e.target.value))}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm"
            >
              {topics.map((t) => (
                <option key={t.id} value={t.order}>
                  {t.title}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1">Tanlangan mavzudan keyin maslahat bloki ko'rinadi</p>
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-100">
            <button type="button" onClick={onClose} className="flex-1 btn-outline">Bekor</button>
            <button type="submit" disabled={loading || !text.trim()} className="flex-1 btn-primary disabled:opacity-50">
              {loading ? "Yaratilmoqda..." : "Qo'shish"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
