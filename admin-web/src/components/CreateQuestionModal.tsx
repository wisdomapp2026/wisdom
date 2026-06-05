import { useState, useRef } from "react";
import { X, Plus, Trash2, Upload, Clock, Image } from "lucide-react";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@shared/firebase";

interface QuestionOption {
  label: string;
  text: string;
  image?: string;
}

interface NewQuestion {
  content: string;
  difficulty: "easy" | "medium" | "hard";
  time: string;
  tags: string[];
  options: QuestionOption[];
  correctAnswer: string;
  image?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (q: NewQuestion) => void;
}

// Rasmni Firebase Storage ga yuklash
async function uploadImage(file: File): Promise<string> {
  const fileName = `questions/${Date.now()}-${file.name}`;
  const storageRef = ref(storage, fileName);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

export default function CreateQuestionModal({ open, onClose, onSave }: Props) {
  const [content, setContent] = useState("");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [timeMinutes, setTimeMinutes] = useState(3);
  const [tags, setTags] = useState("");
  const [options, setOptions] = useState<QuestionOption[]>([
    { label: "A", text: "" },
    { label: "B", text: "" },
    { label: "C", text: "" },
    { label: "D", text: "" },
  ]);
  const [correctAnswer, setCorrectAnswer] = useState("A");
  const [questionImage, setQuestionImage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [pastedImages, setPastedImages] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  // File input orqali rasm yuklash
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadImage(file);
      setQuestionImage(url);
    } catch (err) {
      console.error("Rasm yuklashda xatolik:", err);
      // Fallback — local preview
      const reader = new FileReader();
      reader.onload = () => setQuestionImage(reader.result as string);
      reader.readAsDataURL(file);
    } finally {
      setUploading(false);
    }
  }

  // Textarea ga rasm paste qilish (Ctrl+V)
  function handlePaste(e: React.ClipboardEvent) {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith("image/")) {
        e.preventDefault();
        const file = items[i].getAsFile();
        if (!file) continue;

        // Local preview darhol ko'rsatish
        const reader = new FileReader();
        reader.onload = async () => {
          const dataUrl = reader.result as string;
          setPastedImages((prev) => [...prev, dataUrl]);

          // Firebase ga yuklash (background)
          try {
            const url = await uploadImage(file);
            setPastedImages((prev) => prev.map((img) => img === dataUrl ? url : img));
          } catch {
            // Local preview saqlanadi
          }
        };
        reader.readAsDataURL(file);
        break;
      }
    }
  }

  function addOption() {
    const nextLabel = String.fromCharCode(65 + options.length);
    setOptions([...options, { label: nextLabel, text: "" }]);
  }

  function removeOption(index: number) {
    if (options.length <= 2) return;
    setOptions(options.filter((_, i) => i !== index));
  }

  function updateOption(index: number, text: string) {
    setOptions(options.map((o, i) => i === index ? { ...o, text } : o));
  }

  function handleSave() {
    if (!content.trim() && pastedImages.length === 0) return alert("Savol matnini kiriting!");
    if (options.every((o) => !o.text.trim() && !o.image)) return alert("Kamida 2 ta variant kiriting (matn yoki rasm)!");

    onSave({
      content: content || (pastedImages.length > 0 ? "[Rasmli savol]" : ""),
      difficulty,
      time: `${timeMinutes} mins`,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      options: options.filter((o) => o.text.trim() || o.image),
      correctAnswer,
      image: questionImage || pastedImages[0] || undefined,
    });

    // Reset
    setContent(""); setOptions([{ label: "A", text: "" }, { label: "B", text: "" }, { label: "C", text: "" }, { label: "D", text: "" }]);
    setCorrectAnswer("A"); setTags(""); setTimeMinutes(3); setQuestionImage(""); setPastedImages([]);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 overflow-y-auto py-8">
      <div className="bg-white rounded-2xl w-full max-w-2xl p-6 shadow-xl my-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Yangi test savol yaratish</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="space-y-5">
          {/* Savol matni + paste rasm */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Savol matni * <span className="text-xs text-gray-400 font-normal">(LaTeX: $$formula$$, rasm paste — Ctrl+V)</span>
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onPaste={handlePaste}
              placeholder="Masalan: $$\frac{3}{4} + \frac{1}{2} = ?$$ yoki oddiy matn... Rasmni Ctrl+V bilan paste qiling."
              rows={4}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none font-mono"
            />
            {/* Paste qilingan rasmlar preview */}
            {pastedImages.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {pastedImages.map((img, i) => (
                  <div key={i} className="relative">
                    <img src={img} alt="" className="w-24 h-24 object-cover rounded-lg border border-gray-200" />
                    <button
                      onClick={() => setPastedImages(pastedImages.filter((_, idx) => idx !== i))}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs"
                    >×</button>
                  </div>
                ))}
              </div>
            )}
            <p className="text-[11px] text-gray-400 mt-1">💡 Word'dan formulalar copy-paste, rasmni Ctrl+V bilan joylashtiring</p>
          </div>

          {/* Savol rasmi — fayl yuklash */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Savol rasmi (ixtiyoriy)</label>
            <div className="flex items-center gap-3">
              {questionImage ? (
                <div className="relative">
                  <img src={questionImage} alt="" className="w-20 h-20 object-cover rounded-lg border border-gray-200" />
                  <button onClick={() => setQuestionImage("")} className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs">×</button>
                </div>
              ) : null}
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-2 px-4 py-2.5 border border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:border-primary-400 hover:text-primary-500 disabled:opacity-50"
              >
                <Upload className="w-4 h-4" />
                {uploading ? "Yuklanmoqda..." : "Rasm yuklash"}
              </button>
            </div>
          </div>

          {/* Qiyinlik + Vaqt + Teglar */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Qiyinlik darajasi</label>
              <select value={difficulty} onChange={(e) => setDifficulty(e.target.value as any)} className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm">
                <option value="easy">🟢 Oson</option>
                <option value="medium">🟡 O'rta</option>
                <option value="hard">🔴 Qiyin</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Vaqt (daqiqa)</label>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-400" />
                <input type="number" value={timeMinutes} onChange={(e) => setTimeMinutes(Number(e.target.value))} min={1} max={60} className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Teglar</label>
              <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Algebra, Kasrlar" className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
            </div>
          </div>

          {/* Variantlar */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-gray-700">Javob variantlari *</label>
              <button onClick={addOption} className="text-xs text-primary-500 font-medium flex items-center gap-1 hover:underline"><Plus className="w-3.5 h-3.5" /> Variant qo'shish</button>
            </div>
            <div className="space-y-2">
              {options.map((opt, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCorrectAnswer(opt.label)}
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 shrink-0 transition-colors ${correctAnswer === opt.label ? "border-green-500 bg-green-500 text-white" : "border-gray-300 text-gray-500 hover:border-primary-300"}`}
                      title="To'g'ri javob sifatida belgilash"
                    >{opt.label}</button>
                    <input
                      value={opt.text}
                      onChange={(e) => updateOption(i, e.target.value)}
                      onPaste={(e) => {
                        const items = e.clipboardData.items;
                        for (let j = 0; j < items.length; j++) {
                          if (items[j].type.startsWith("image/")) {
                            e.preventDefault();
                            const file = items[j].getAsFile();
                            if (!file) continue;
                            const reader = new FileReader();
                            reader.onload = () => {
                              setOptions(options.map((o, idx) => idx === i ? { ...o, image: reader.result as string } : o));
                            };
                            reader.readAsDataURL(file);
                            break;
                          }
                        }
                      }}
                      placeholder={`${opt.label} varianti (LaTeX: $$formula$$, rasm: Ctrl+V)`}
                      className="flex-1 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono"
                    />
                    {/* Rasm yuklash button */}
                    <label className="p-1.5 text-gray-400 hover:text-primary-500 cursor-pointer" title="Rasm yuklash">
                      <Image className="w-4 h-4" />
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = () => {
                          setOptions(options.map((o, idx) => idx === i ? { ...o, image: reader.result as string } : o));
                        };
                        reader.readAsDataURL(file);
                      }} />
                    </label>
                    {options.length > 2 && (
                      <button onClick={() => removeOption(i)} className="p-1.5 text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                    )}
                  </div>
                  {/* Variant rasmi preview */}
                  {opt.image && (
                    <div className="ml-10 relative inline-block">
                      <img src={opt.image} alt="" className="h-16 rounded-lg border border-gray-200" />
                      <button onClick={() => setOptions(options.map((o, idx) => idx === i ? { ...o, image: undefined } : o))} className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center text-[8px]">×</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <p className="text-[11px] text-gray-400 mt-2">🟢 Yashil doira = to'g'ri javob. Variantlarga ham LaTeX formula qo'shish mumkin.</p>
          </div>

          {/* To'g'ri javob */}
          <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-3">
            <span className="text-green-600 font-bold">✓</span>
            <p className="text-sm text-green-800">To'g'ri javob: <strong>{correctAnswer}</strong> — {options.find((o) => o.label === correctAnswer)?.text || "(matn kiritilmagan)"}</p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
            <button onClick={onClose} className="flex-1 btn-outline">Bekor qilish</button>
            <button onClick={handleSave} className="flex-1 btn-primary">Savolni saqlash</button>
          </div>
        </div>
      </div>
    </div>
  );
}
