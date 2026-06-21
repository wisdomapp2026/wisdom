import { useState, useEffect } from "react";
import { X, FolderPlus, Upload, ImageIcon } from "lucide-react";
import { createFolder, updateFolder } from "@shared/repositories";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@shared/firebase";
import LoadingButton from "./LoadingButton";
import type { Folder } from "@shared/types";

interface Props {
  open: boolean;
  courseId: string;
  existingCount: number;
  editFolder?: Folder | null; // tahrirlash uchun
  onClose: () => void;
  onSaved: () => void;
}

const FOLDER_ICONS = ["📚", "📖", "📕", "📗", "📘", "📙", "📔", "📓", "📒", "🗂️"];

export default function CreateFolderModal({ open, courseId, existingCount, editFolder, onClose, onSaved }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("📚");
  const [isPremium, setIsPremium] = useState(false);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editFolder) {
      setTitle(editFolder.title);
      setDescription(editFolder.description || "");
      setIcon(editFolder.icon || "📚");
      setIsPremium(editFolder.isPremium || false);
      setCoverPreview(editFolder.coverImage || "");
      setCoverFile(null);
    } else {
      setTitle("");
      setDescription("");
      setIcon("📚");
      setIsPremium(false);
      setCoverPreview("");
      setCoverFile(null);
    }
  }, [editFolder, open]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const now = Date.now();

    try {
      // Muqova rasmini yuklash (agar yangi rasm tanlangan bo'lsa)
      let coverImage = editFolder?.coverImage || "";
      if (coverFile) {
        const storageRef = ref(storage, `folder-covers/${courseId}/${now}-${coverFile.name}`);
        await uploadBytes(storageRef, coverFile);
        coverImage = await getDownloadURL(storageRef);
      }

      if (editFolder) {
        await updateFolder(courseId, editFolder.id, {
          title: title.trim(),
          description: description.trim(),
          icon,
          isPremium,
          ...(coverImage ? { coverImage } : {}),
        });
      } else {
        const order = existingCount + 1;
        const folder: Folder = {
          id: `folder-${now}`,
          courseId,
          title: title.trim(),
          description: description.trim(),
          icon,
          order,
          isPremium,
          ...(coverImage ? { coverImage } : {}),
          createdAt: now,
          updatedAt: now,
        };
        await createFolder(courseId, folder);
      }
      onSaved();
      onClose();
    } catch (err) {
      console.error("Papka saqlashda xatolik:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <FolderPlus className="w-5 h-5 text-primary-500" />
            <h2 className="text-xl font-bold text-gray-900">
              {editFolder ? "Papkani tahrirlash" : "Yangi papka qo'shish"}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Papka nomi *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Masalan: IDC 1"
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
              autoFocus
            />
            <p className="text-xs text-gray-400 mt-1">Odatda kitob nomi bilan ataladi (masalan: IDC 1, IDC 2)</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tavsif</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Bu kitob/bo'lim haqida qisqacha..."
              rows={2}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kitob muqovasi (rasm)</label>
            <div className="flex items-center gap-3">
              {coverPreview ? (
                <div className="relative w-20 h-28 rounded-lg overflow-hidden border border-gray-200 shrink-0">
                  <img src={coverPreview} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => { setCoverFile(null); setCoverPreview(""); }}
                    className="absolute top-1 right-1 w-5 h-5 bg-black/60 text-white rounded-full text-xs flex items-center justify-center"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div className="w-20 h-28 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center shrink-0">
                  <ImageIcon className="w-6 h-6 text-gray-300" />
                </div>
              )}
              <label className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 cursor-pointer hover:bg-gray-50">
                <Upload className="w-4 h-4" />
                {coverFile ? "Rasmni almashtirish" : "Muqova yuklash"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setCoverFile(file);
                      setCoverPreview(URL.createObjectURL(file));
                    }
                  }}
                />
              </label>
            </div>
            <p className="text-xs text-gray-400 mt-1">Tavsiya: vertikal (kitob) formatdagi rasm</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Ikonka (muqova bo'lmasa ishlatiladi)</label>
            <div className="flex flex-wrap gap-2">
              {FOLDER_ICONS.map((ic) => (
                <button
                  key={ic}
                  type="button"
                  onClick={() => setIcon(ic)}
                  className={`w-10 h-10 rounded-lg text-lg flex items-center justify-center border transition-all ${
                    icon === ic ? "border-primary-400 bg-primary-50" : "border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  {ic}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="folderPremium"
              checked={isPremium}
              onChange={(e) => setIsPremium(e.target.checked)}
              className="w-4 h-4 text-primary-500 rounded"
            />
            <label htmlFor="folderPremium" className="text-sm text-gray-700">Premium papka</label>
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-100">
            <button type="button" onClick={onClose} className="flex-1 btn-outline">Bekor</button>
            <LoadingButton type="submit" loading={loading} disabled={!title.trim()} className="flex-1 btn-primary">
              {editFolder ? "Saqlash" : "Qo'shish"}
            </LoadingButton>
          </div>
        </form>
      </div>
    </div>
  );
}
