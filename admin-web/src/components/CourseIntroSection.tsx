import { useState } from "react";
import { Edit, Trash2, Plus, Play, Video, X, Check, Upload, ImageIcon, FileText, Paperclip } from "lucide-react";
import { updateCourse } from "@shared/repositories";
import { supabase } from "@shared/supabase";
import type { Course, CourseIntroduction } from "@shared/types";
import RichMathInput from "./RichMathInput";
import RichTextEditor from "./RichTextEditor";
import LatexText from "./LatexText";

/** Ruxsat etilgan biriktirma fayl turlari (PDF, Word) */
const ALLOWED_FILE_EXT = [".pdf", ".doc", ".docx"];

function isAllowedFile(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return ALLOWED_FILE_EXT.some((ext) => lower.endsWith(ext));
}

interface Props {
  course: Course;
  onUpdate: (updated: Course) => void;
}

export default function CourseIntroSection({ course, onUpdate }: Props) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(course.introduction?.text || "");
  const [videoUrl, setVideoUrl] = useState(course.introduction?.videoUrl || "");
  const [videoType, setVideoType] = useState<"youtube" | "upload">(course.introduction?.videoType || "youtube");
  const [thumbnailUrl, setThumbnailUrl] = useState(course.introduction?.thumbnailUrl || "");
  const [imageUrl, setImageUrl] = useState(course.introduction?.imageUrl || "");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState(course.introduction?.imageUrl || "");
  const [afterVideoText, setAfterVideoText] = useState(course.introduction?.afterVideoText || "");
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [attachedFileUrl, setAttachedFileUrl] = useState(course.introduction?.attachedFileUrl || "");
  const [attachedFileName, setAttachedFileName] = useState(course.introduction?.attachedFileName || "");
  const [fileError, setFileError] = useState("");
  const [saving, setSaving] = useState(false);

  const hasIntro = !!course.introduction;

  // YouTube thumbnail avtomatik olish
  function getYouTubeThumbnail(url: string): string {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?]+)/);
    return match ? `https://img.youtube.com/vi/${match[1]}/mqdefault.jpg` : "";
  }

  async function handleSave() {
    setSaving(true);
    try {
      // Rasm upload (agar yangi fayl tanlangan bo'lsa)
      let finalImageUrl = imageUrl;
      if (imageFile) {
        const filePath = `course-intro/${course.id}/${Date.now()}-${imageFile.name}`;
        const { error: uploadErr } = await supabase.storage.from("edukids").upload(filePath, imageFile);
        if (uploadErr) throw uploadErr;
        finalImageUrl = supabase.storage.from("edukids").getPublicUrl(filePath).data.publicUrl;
      }

      // Biriktirilgan fayl (PDF/Word) upload
      let finalFileUrl = attachedFileUrl;
      let finalFileName = attachedFileName;
      if (attachedFile) {
        const filePath = `course-intro/${course.id}/files/${Date.now()}-${attachedFile.name}`;
        const { error: uploadErr } = await supabase.storage.from("edukids").upload(filePath, attachedFile);
        if (uploadErr) throw uploadErr;
        finalFileUrl = supabase.storage.from("edukids").getPublicUrl(filePath).data.publicUrl;
        finalFileName = attachedFile.name;
      }

      const introduction: CourseIntroduction = {
        text: text.trim(),
        videoUrl: videoUrl.trim(),
        videoType,
        thumbnailUrl: thumbnailUrl.trim() || (videoType === "youtube" ? getYouTubeThumbnail(videoUrl) : ""),
        ...(finalImageUrl ? { imageUrl: finalImageUrl } : {}),
        ...(afterVideoText.trim() ? { afterVideoText: afterVideoText.trim() } : {}),
        ...(finalFileUrl ? { attachedFileUrl: finalFileUrl, attachedFileName: finalFileName } : {}),
      };
      await updateCourse(course.id, { introduction });
      onUpdate({ ...course, introduction });
      setImageUrl(finalImageUrl);
      setImageFile(null);
      setAttachedFileUrl(finalFileUrl);
      setAttachedFileName(finalFileName);
      setAttachedFile(null);
      setEditing(false);
    } catch (err) {
      console.error("Introduction saqlashda xatolik:", err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Kursni tanishtirish bo'limini o'chirishga ishonchingiz komilmi?")) return;
    setSaving(true);
    try {
      await updateCourse(course.id, { introduction: null } as any);
      onUpdate({ ...course, introduction: undefined });
    } catch (err) {
      console.error("Introduction o'chirishda xatolik:", err);
    } finally {
      setSaving(false);
    }
  }

  async function handleAdd() {
    const introduction: CourseIntroduction = {
      text: course.description || "Bu kursda nimalar o'rganiladi haqida qisqacha ma'lumot.",
      videoUrl: "",
      videoType: "youtube",
      thumbnailUrl: "",
    };
    setSaving(true);
    try {
      await updateCourse(course.id, { introduction });
      onUpdate({ ...course, introduction });
      setText(introduction.text);
      setVideoUrl("");
      setVideoType("youtube");
      setThumbnailUrl("");
      setAfterVideoText("");
      setAttachedFile(null);
      setAttachedFileUrl("");
      setAttachedFileName("");
      setEditing(true);
    } catch (err) {
      console.error("Introduction qo'shishda xatolik:", err);
    } finally {
      setSaving(false);
    }
  }

  // Kursni tanishtirish bo'limi o'chirilgan — qo'shish tugmasi
  if (!hasIntro) {
    return (
      <div className="bg-white rounded-xl border border-dashed border-gray-300 p-6 text-center">
        <p className="text-gray-400 mb-3">Kursni tanishtirish bo'limi o'chirilgan</p>
        <button
          onClick={handleAdd}
          disabled={saving}
          className="btn-primary text-sm inline-flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Kursni tanishtirish bo'limini qo'shish
        </button>
      </div>
    );
  }

  // Tahrirlash rejimi
  if (editing) {
    return (
      <div className="bg-white rounded-xl border border-blue-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <Video className="w-5 h-5 text-primary-500" />
            Kursni tanishtirish — Tahrirlash
          </h3>
          <button onClick={() => setEditing(false)} className="p-2 text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tanishtirish matni *</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Kurs haqida qisqacha ma'lumot yozing..."
            rows={3}
            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Video turi</label>
            <select
              value={videoType}
              onChange={(e) => setVideoType(e.target.value as "youtube" | "upload")}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm"
            >
              <option value="youtube">YouTube</option>
              <option value="upload">Upload qilingan</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Video URL</label>
            <input
              type="url"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder={videoType === "youtube" ? "https://youtube.com/watch?v=..." : "https://..."}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Thumbnail URL (ixtiyoriy)</label>
          <input
            type="url"
            value={thumbnailUrl}
            onChange={(e) => setThumbnailUrl(e.target.value)}
            placeholder="YouTube video uchun avtomatik olinadi"
            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          {videoType === "youtube" && videoUrl && (
            <p className="text-xs text-gray-400 mt-1">
              YouTube thumbnail avtomatik olinadi: {getYouTubeThumbnail(videoUrl) || "URL noto'g'ri"}
            </p>
          )}
        </div>

        {/* Rasm yuklash */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tanishtirish rasmi (ixtiyoriy)</label>
          <div className="flex items-center gap-3">
            {imagePreview ? (
              <div className="relative w-24 h-16 rounded-lg overflow-hidden border border-gray-200 shrink-0">
                <img src={imagePreview} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => { setImageFile(null); setImagePreview(""); setImageUrl(""); }}
                  className="absolute top-1 right-1 w-5 h-5 bg-black/60 text-white rounded-full text-xs flex items-center justify-center"
                >
                  ✕
                </button>
              </div>
            ) : (
              <div className="w-24 h-16 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center shrink-0">
                <ImageIcon className="w-5 h-5 text-gray-300" />
              </div>
            )}
            <label className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 cursor-pointer hover:bg-gray-50">
              <Upload className="w-4 h-4" />
              {imageFile ? "Rasmni almashtirish" : "Rasm yuklash"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setImageFile(file);
                    setImagePreview(URL.createObjectURL(file));
                  }
                }}
              />
            </label>
          </div>
          <p className="text-xs text-gray-400 mt-1">Kurs haqida rasm qo'shish (banner yoki screenshot)</p>
        </div>

        {/* Videodan keyingi matn — Rich Text Editor */}
        <div>
          <RichTextEditor
            label="Batafsil izoh (ixtiyoriy)"
            value={afterVideoText}
            onChange={setAfterVideoText}
            placeholder="Kurs haqida batafsil tushuntirish, dastur mazmuni, ro'yxatlar... Word dan copy-paste qilsangiz stillar saqlanadi."
            hint="Word yoki boshqa manbadan nusxa ko'chirib paste qilsangiz, shrift dizaynlari (qalin, qiyshiq, ro'yxatlar) avtomatik saqlanadi."
          />
        </div>

        {/* Biriktirilgan fayl (PDF/Word) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Biriktirilgan fayl (ixtiyoriy)</label>
          {attachedFileName ? (
            <div className="flex items-center gap-3 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg">
              <FileText className="w-5 h-5 text-primary-500 shrink-0" />
              <span className="flex-1 text-sm text-gray-700 truncate">{attachedFileName}</span>
              <button
                type="button"
                onClick={() => { setAttachedFile(null); setAttachedFileUrl(""); setAttachedFileName(""); setFileError(""); }}
                className="text-gray-400 hover:text-red-500 shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <label className="flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-gray-200 rounded-lg text-sm text-gray-600 cursor-pointer hover:border-primary-300 hover:bg-primary-50/30">
              <Paperclip className="w-4 h-4" />
              PDF yoki Word fayl biriktirish
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (!isAllowedFile(file.name)) {
                    setFileError("Faqat PDF yoki Word (.pdf, .doc, .docx) fayllarni biriktirish mumkin");
                    return;
                  }
                  setFileError("");
                  setAttachedFile(file);
                  setAttachedFileName(file.name);
                }}
              />
            </label>
          )}
          {fileError && <p className="text-xs text-red-500 mt-1">{fileError}</p>}
          <p className="text-xs text-gray-400 mt-1">Student bu faylni sahifadan yuklab olishi mumkin bo'ladi</p>
        </div>

        <div className="flex gap-3 pt-4 border-t border-gray-100">
          <button onClick={() => setEditing(false)} className="flex-1 btn-outline">Bekor</button>
          <button
            onClick={handleSave}
            disabled={saving || !text.trim()}
            className="flex-1 btn-primary disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? "Saqlanmoqda..." : <><Check className="w-4 h-4" /> Saqlash</>}
          </button>
        </div>
      </div>
    );
  }

  // Ko'rish rejimi
  const intro = course.introduction!;
  const thumbnail = intro.thumbnailUrl || (intro.videoType === "youtube" && intro.videoUrl ? getYouTubeThumbnail(intro.videoUrl) : "");

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-bold text-gray-900 flex items-center gap-2">
          <Video className="w-5 h-5 text-primary-500" />
          Kursni tanishtirish
        </h3>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setEditing(true)}
            className="p-2 text-gray-400 hover:text-primary-500 hover:bg-primary-50 rounded-lg"
            title="Tahrirlash"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={handleDelete}
            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
            title="O'chirish"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex items-start gap-4">
        {/* Thumbnail */}
        {thumbnail ? (
          <div className="relative w-28 h-20 rounded-lg overflow-hidden shrink-0 bg-gray-100">
            <img src={thumbnail} alt="Video thumbnail" className="w-full h-full object-cover" />
            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
              <div className="w-8 h-8 bg-white/90 rounded-full flex items-center justify-center">
                <Play className="w-4 h-4 text-gray-800 ml-0.5" />
              </div>
            </div>
          </div>
        ) : (
          <div className="w-28 h-20 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
            <Video className="w-8 h-8 text-gray-300" />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-700 leading-relaxed line-clamp-2">{intro.text}</p>
          <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
            {intro.videoUrl ? (
              <span className="flex items-center gap-1 text-green-600">
                <Play className="w-3 h-3" /> Video biriktirilgan
              </span>
            ) : (
              <span className="flex items-center gap-1 text-yellow-600">
                ⚠️ Video qo'shilmagan
              </span>
            )}
            {intro.imageUrl && (
              <span className="flex items-center gap-1 text-blue-600">
                <ImageIcon className="w-3 h-3" /> Rasm biriktirilgan
              </span>
            )}
            {intro.afterVideoText && (
              <span className="flex items-center gap-1 text-purple-600">
                📝 Qo'shimcha matn bor
              </span>
            )}
            {intro.attachedFileUrl && (
              <span className="flex items-center gap-1 text-orange-600">
                <Paperclip className="w-3 h-3" /> Fayl biriktirilgan
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Rasm preview (agar bor bo'lsa) */}
      {intro.imageUrl && (
        <div className="mt-3 rounded-lg overflow-hidden border border-gray-100">
          <img src={intro.imageUrl} alt="Kurs tanishtirish rasmi" className="w-full max-h-48 object-cover" />
        </div>
      )}

      {/* Biriktirilgan fayl preview */}
      {intro.attachedFileUrl && (
        <a
          href={intro.attachedFileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 flex items-center gap-2 px-3 py-2 bg-orange-50 border border-orange-100 rounded-lg text-sm text-orange-700 hover:bg-orange-100 transition-colors"
        >
          <FileText className="w-4 h-4 shrink-0" />
          <span className="truncate">{intro.attachedFileName || "Biriktirilgan fayl"}</span>
        </a>
      )}
    </div>
  );
}
