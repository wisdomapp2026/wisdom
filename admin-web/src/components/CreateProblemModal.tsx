import { useState, useRef, useEffect } from "react";
import { X, Upload } from "lucide-react";
import { createProblem, updateProblem } from "@shared/repositories";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@shared/firebase";
import type { Problem } from "@shared/types";

interface Props {
  open: boolean;
  courseId: string;
  topicId: string;
  existingCount: number;
  onClose: () => void;
  onCreated: () => void;
  /** Agar berilsa — tahrirlash rejimi */
  editData?: Problem | null;
}

export default function CreateProblemModal({ open, courseId, topicId, existingCount, onClose, onCreated, editData }: Props) {
  const [content, setContent] = useState("");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("easy");
  const [videoUrl, setVideoUrl] = useState("");
  const [videoType, setVideoType] = useState<"youtube" | "upload" | "youtube_time">("youtube");
  const [tags, setTags] = useState("");
  const [estimatedMinutes, setEstimatedMinutes] = useState(3);
  const [solutionText, setSolutionText] = useState("");
  const [loading, setLoading] = useState(false);
  // YouTube with time
  const [startMin, setStartMin] = useState(0);
  const [startSec, setStartSec] = useState(0);
  const [endMin, setEndMin] = useState(0);
  const [endSec, setEndSec] = useState(0);
  // File upload
  const [uploading, setUploading] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState("");
  const videoFileRef = useRef<HTMLInputElement>(null);
  // Solution image
  const [solutionImage, setSolutionImage] = useState("");
  const [uploadingSolImg, setUploadingSolImg] = useState(false);
  const solutionImageRef = useRef<HTMLInputElement>(null);

  // Edit mode — formani to'ldirish
  useEffect(() => {
    if (open && editData) {
      setContent(editData.content || "");
      setDifficulty(editData.difficulty || "easy");
      setVideoUrl(editData.videoUrl || "");
      setVideoType(editData.videoType || "youtube");
      setTags(editData.tags?.join(", ") || "");
      setEstimatedMinutes(editData.estimatedMinutes || 3);
      setSolutionText(editData.solution?.map((s) => s.text).join("\n") || "");
      setSolutionImage(editData.solutionImage || "");
      // YouTube time parsing
      if (editData.videoUrl && editData.videoUrl.includes("start=")) {
        setVideoType("youtube_time");
        const params = new URLSearchParams(editData.videoUrl.split("?")[1] || "");
        const start = parseInt(params.get("start") || "0");
        const end = parseInt(params.get("end") || "0");
        setStartMin(Math.floor(start / 60));
        setStartSec(start % 60);
        setEndMin(Math.floor(end / 60));
        setEndSec(end % 60);
        // URL dan parametrlarni olib tashlash
        const baseUrl = editData.videoUrl.split("?")[0] + "?" + Array.from(params.entries()).filter(([k]) => k !== "start" && k !== "end").map(([k, v]) => `${k}=${v}`).join("&");
        setVideoUrl(baseUrl.endsWith("?") ? baseUrl.slice(0, -1) : baseUrl);
      }
    } else if (open && !editData) {
      setContent(""); setDifficulty("easy"); setVideoUrl(""); setVideoType("youtube");
      setTags(""); setEstimatedMinutes(3); setSolutionText("");
      setStartMin(0); setStartSec(0); setEndMin(0); setEndSec(0);
      setUploadedFileName(""); setSolutionImage("");
    }
  }, [open, editData]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    // Video URL ni tayyorlash
    let finalVideoUrl = videoUrl || undefined;
    let finalVideoType: "youtube" | "upload" | undefined = videoUrl ? (videoType === "youtube_time" ? "youtube" : videoType) : undefined;

    if (videoType === "youtube_time" && videoUrl) {
      const startSeconds = startMin * 60 + startSec;
      const endSeconds = endMin * 60 + endSec;
      const separator = videoUrl.includes("?") ? "&" : "?";
      finalVideoUrl = `${videoUrl}${separator}start=${startSeconds}&end=${endSeconds}`;
      finalVideoType = "youtube";
    }

    const solutionSteps = solutionText
      ? solutionText.split("\n").map((line, i) => ({ stepNumber: i + 1, text: line.trim() })).filter((s) => s.text)
      : undefined;

    try {
      if (editData) {
        // EDIT mode
        await updateProblem(courseId, topicId, editData.id, {
          content,
          difficulty,
          videoUrl: finalVideoUrl,
          videoType: finalVideoType,
          tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
          estimatedMinutes,
          solution: solutionSteps,
          solutionImage: solutionImage || undefined,
        });
      } else {
        // CREATE mode
        const order = existingCount + 1;
        const id = `p-${topicId.replace("topic-", "")}-${order}-${Date.now()}`;
        const now = Date.now();

        const problem: Problem = {
          id,
          topicId,
          courseId,
          content,
          difficulty,
          order,
          videoUrl: finalVideoUrl,
          videoType: finalVideoType,
          tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
          estimatedMinutes,
          solution: solutionSteps,
          solutionImage: solutionImage || undefined,
          createdAt: now,
        };

        await createProblem(courseId, topicId, problem);
      }

      onCreated();
      onClose();
    } catch (err) {
      console.error("Misol saqlashda xatolik:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleVideoFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadedFileName(file.name);
    try {
      const fileName = `videos/${Date.now()}-${file.name}`;
      const storageRef = ref(storage, fileName);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setVideoUrl(url);
    } catch (err) {
      console.error("Video yuklashda xatolik:", err);
      alert("Video yuklashda xatolik yuz berdi!");
      setUploadedFileName("");
    } finally {
      setUploading(false);
    }
  }

  async function handleSolutionImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingSolImg(true);
    try {
      const fileName = `solutions/${Date.now()}-${file.name}`;
      const storageRef = ref(storage, fileName);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setSolutionImage(url);
    } catch (err) {
      console.error("Rasm yuklashda xatolik:", err);
      // Fallback — local preview
      const reader = new FileReader();
      reader.onload = () => setSolutionImage(reader.result as string);
      reader.readAsDataURL(file);
    } finally {
      setUploadingSolImg(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 overflow-y-auto py-8">
      <div className="bg-white rounded-2xl w-full max-w-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">{editData ? "Misolni tahrirlash" : "Yangi misol qo'shish"}</h2>
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
            <div className="space-y-3">
              <select
                value={videoType}
                onChange={(e) => { setVideoType(e.target.value as any); setVideoUrl(""); setUploadedFileName(""); }}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm"
              >
                <option value="youtube">YouTube</option>
                <option value="upload">Fayl yuklash (Upload)</option>
                <option value="youtube_time">YouTube (vaqt belgilash bilan)</option>
              </select>

              {/* YouTube */}
              {videoType === "youtube" && (
                <input
                  type="url"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                />
              )}

              {/* File Upload */}
              {videoType === "upload" && (
                <div className="flex items-center gap-3">
                  <input
                    ref={videoFileRef}
                    type="file"
                    accept="video/*"
                    onChange={handleVideoFileUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => videoFileRef.current?.click()}
                    disabled={uploading}
                    className="flex items-center gap-2 px-4 py-2.5 border border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-primary-400 hover:text-primary-500 disabled:opacity-50"
                  >
                    <Upload className="w-4 h-4" />
                    {uploading ? "Yuklanmoqda..." : "Video faylni tanlash"}
                  </button>
                  {uploadedFileName && (
                    <span className="text-xs text-green-600 font-medium">✓ {uploadedFileName}</span>
                  )}
                </div>
              )}

              {/* YouTube with time */}
              {videoType === "youtube_time" && (
                <div className="space-y-3">
                  <input
                    type="url"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                      <p className="text-xs font-medium text-gray-600 mb-2">▶️ Boshlash vaqti</p>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={startMin}
                          onChange={(e) => setStartMin(Number(e.target.value))}
                          min={0}
                          className="w-16 px-2 py-1.5 bg-white border border-gray-200 rounded text-sm text-center"
                          placeholder="0"
                        />
                        <span className="text-xs text-gray-500">daq</span>
                        <input
                          type="number"
                          value={startSec}
                          onChange={(e) => setStartSec(Number(e.target.value))}
                          min={0}
                          max={59}
                          className="w-16 px-2 py-1.5 bg-white border border-gray-200 rounded text-sm text-center"
                          placeholder="0"
                        />
                        <span className="text-xs text-gray-500">sek</span>
                      </div>
                    </div>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                      <p className="text-xs font-medium text-gray-600 mb-2">⏹️ Tugash vaqti</p>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={endMin}
                          onChange={(e) => setEndMin(Number(e.target.value))}
                          min={0}
                          className="w-16 px-2 py-1.5 bg-white border border-gray-200 rounded text-sm text-center"
                          placeholder="0"
                        />
                        <span className="text-xs text-gray-500">daq</span>
                        <input
                          type="number"
                          value={endSec}
                          onChange={(e) => setEndSec(Number(e.target.value))}
                          min={0}
                          max={59}
                          className="w-16 px-2 py-1.5 bg-white border border-gray-200 rounded text-sm text-center"
                          placeholder="0"
                        />
                        <span className="text-xs text-gray-500">sek</span>
                      </div>
                    </div>
                  </div>
                  {videoUrl && startMin + startSec > 0 && (
                    <p className="text-xs text-blue-600 bg-blue-50 px-3 py-2 rounded-lg">
                      📹 Video {startMin}:{startSec.toString().padStart(2, "0")} dan {endMin}:{endSec.toString().padStart(2, "0")} gacha ijro etiladi
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Solution steps */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Yechim bosqichlari <span className="text-xs text-gray-400">(LaTeX: $$formula$$, har bir qator = 1 qadam)</span>
            </label>
            <textarea
              value={solutionText}
              onChange={(e) => setSolutionText(e.target.value)}
              placeholder={"$$3x = 36 - 12 = 24$$\n$$x = 24 ÷ 3 = 8$$\nJavob: x = 8"}
              rows={4}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm resize-none font-mono"
            />
            <p className="text-xs text-gray-400 mt-1">💡 LaTeX formulalarni $$...$$ ichida yozing. Masalan: $$\\frac{3}{4} + \\frac{1}{2} = \\frac{5}{4}$$</p>
            {/* Yechim rasmi */}
            <div className="mt-3">
              <label className="block text-xs font-medium text-gray-600 mb-1">Yechim rasmi (ixtiyoriy)</label>
              <div className="flex items-center gap-3">
                {solutionImage && (
                  <div className="relative">
                    <img src={solutionImage} alt="" className="h-20 rounded-lg border border-gray-200" />
                    <button type="button" onClick={() => setSolutionImage("")} className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs">×</button>
                  </div>
                )}
                <input ref={solutionImageRef} type="file" accept="image/*" onChange={handleSolutionImageUpload} className="hidden" />
                <button
                  type="button"
                  onClick={() => solutionImageRef.current?.click()}
                  disabled={uploadingSolImg}
                  className="flex items-center gap-2 px-3 py-2 border border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-primary-400 hover:text-primary-500 disabled:opacity-50"
                >
                  <Upload className="w-4 h-4" />
                  {uploadingSolImg ? "Yuklanmoqda..." : "Yechim rasmini yuklash"}
                </button>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-100">
            <button type="button" onClick={onClose} className="flex-1 btn-outline">Bekor</button>
            <button type="submit" disabled={loading || !content} className="flex-1 btn-primary disabled:opacity-50">
              {loading ? "Saqlanmoqda..." : editData ? "O'zgarishlarni saqlash" : "Misolni qo'shish"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
