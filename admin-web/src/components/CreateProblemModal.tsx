import { useState } from "react";
import { X, Upload } from "lucide-react";
import { createProblem } from "@shared/repositories";
import type { Problem } from "@shared/types";

interface Props {
  open: boolean;
  courseId: string;
  topicId: string;
  existingCount: number;
  onClose: () => void;
  onCreated: () => void;
}

export default function CreateProblemModal({ open, courseId, topicId, existingCount, onClose, onCreated }: Props) {
  const [content, setContent] = useState("");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("easy");
  const [videoUrl, setVideoUrl] = useState("");
  const [videoType, setVideoType] = useState<"youtube" | "upload">("youtube");
  const [tags, setTags] = useState("");
  const [estimatedMinutes, setEstimatedMinutes] = useState(3);
  const [solutionText, setSolutionText] = useState("");
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const order = existingCount + 1;
    const id = `p-${topicId.replace("topic-", "")}-${order}`;
    const now = Date.now();

    const problem: Problem = {
      id,
      topicId,
      courseId,
      content,
      difficulty,
      order,
      videoUrl: videoUrl || undefined,
      videoType: videoUrl ? videoType : undefined,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      estimatedMinutes,
      solution: solutionText
        ? solutionText.split("\n").map((line, i) => ({ stepNumber: i + 1, text: line.trim() })).filter((s) => s.text)
        : undefined,
      createdAt: now,
    };

    try {
      await createProblem(courseId, topicId, problem);
      onCreated();
      onClose();
      setContent("");
      setVideoUrl("");
      setSolutionText("");
      setTags("");
    } catch (err) {
      console.error("Misol yaratishda xatolik:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 overflow-y-auto py-8">
      <div className="bg-white rounded-2xl w-full max-w-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Yangi misol qo'shish</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Content - LaTeX qo'llab-quvvatlaydi */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Misol matni * <span className="text-xs text-gray-400">(LaTeX: $$formula$$ ichida yozing)</span>
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Masalan: $$3x + 12 = 36$$. $$x$$ ni toping."
              rows={4}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none font-mono"
              required
            />
            <p className="text-xs text-gray-400 mt-1">
              💡 Word dan nusxalasangiz LaTeX formulalar $$...$$ ichida turishi kerak
            </p>
          </div>

          {/* Rasm yuklash (placeholder) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rasm (ixtiyoriy)</label>
            <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center hover:border-primary-300 cursor-pointer transition-colors">
              <Upload className="w-6 h-6 text-gray-400 mx-auto mb-1" />
              <p className="text-xs text-gray-500">Rasmni shu yerga tashlang yoki bosing</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {/* Difficulty */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Qiyinlik</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as any)}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm"
              >
                <option value="easy">Oson</option>
                <option value="medium">O'rta</option>
                <option value="hard">Qiyin</option>
              </select>
            </div>

            {/* Time */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vaqt (daq)</label>
              <input
                type="number"
                value={estimatedMinutes}
                onChange={(e) => setEstimatedMinutes(Number(e.target.value))}
                min={1}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm"
              />
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Teglar</label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="Algebra, Kasrlar"
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm"
              />
            </div>
          </div>

          {/* Video */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Video yechim</label>
            <div className="flex items-center gap-2">
              <select
                value={videoType}
                onChange={(e) => setVideoType(e.target.value as any)}
                className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm"
              >
                <option value="youtube">YouTube</option>
                <option value="upload">Upload</option>
              </select>
              <input
                type="url"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm"
              />
            </div>
          </div>

          {/* Solution steps */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Yechim bosqichlari <span className="text-xs text-gray-400">(har bir qator = 1 qadam)</span>
            </label>
            <textarea
              value={solutionText}
              onChange={(e) => setSolutionText(e.target.value)}
              placeholder={"3x = 36 - 12 = 24\nx = 24 ÷ 3 = 8"}
              rows={3}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm resize-none font-mono"
            />
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-100">
            <button type="button" onClick={onClose} className="flex-1 btn-outline">Bekor</button>
            <button type="submit" disabled={loading || !content} className="flex-1 btn-primary disabled:opacity-50">
              {loading ? "Saqlanmoqda..." : "Misolni qo'shish"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
