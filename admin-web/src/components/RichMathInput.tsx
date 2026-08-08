import { useState, useRef, useEffect, useCallback } from "react";
import { ImageIcon, FunctionSquare, X } from "lucide-react";
import { uploadFile } from "@shared/supabase";

/**
 * Matematik formulalar va rasm paste qilib yozish uchun rich input.
 * - contentEditable div ishlatadi — rasm inline ko'rinadi
 * - Ma'lumot [IMG:url] formatda saqlanadi (value string)
 * - LaTeX formulalar $$...$$ ichida
 * - Maxsus matematik belgilar paneli
 */

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  required?: boolean;
  label?: string;
  hint?: string;
  singleLine?: boolean;
}

// Matematik belgilar
const MATH_SYMBOLS = [
  { symbol: "+", label: "Plus" },
  { symbol: "-", label: "Minus" },
  { symbol: "×", label: "Ko'paytirish" },
  { symbol: "÷", label: "Bo'lish" },
  { symbol: "=", label: "Teng" },
  { symbol: "≠", label: "Teng emas" },
  { symbol: "±", label: "Plus-minus" },
  { symbol: ">", label: "Katta" },
  { symbol: "<", label: "Kichik" },
  { symbol: "≥", label: "Katta yoki teng" },
  { symbol: "≤", label: "Kichik yoki teng" },
  { symbol: "≈", label: "Taxminan" },
  { symbol: "$$\\frac{}{}$$", label: "Kasr (frac)" },
  { symbol: "$$\\sqrt{}$$", label: "Ildiz (sqrt)" },
  { symbol: "$$\\sqrt[n]{}$$", label: "n-ildiz" },
  { symbol: "$$x^{}$$", label: "Daraja (^)" },
  { symbol: "$$x_{}$$", label: "Indeks (_)" },
  { symbol: "$$\\sum$$", label: "Summa (Σ)" },
  { symbol: "$$\\int$$", label: "Integral (∫)" },
  { symbol: "$$\\infty$$", label: "Cheksizlik (∞)" },
  { symbol: "$$\\pi$$", label: "Pi (π)" },
  { symbol: "$$\\alpha$$", label: "Alfa (α)" },
  { symbol: "$$\\beta$$", label: "Beta (β)" },
  { symbol: "$$\\gamma$$", label: "Gamma (γ)" },
  { symbol: "$$\\theta$$", label: "Theta (θ)" },
  { symbol: "$$\\Delta$$", label: "Delta (Δ)" },
  { symbol: "$$\\lambda$$", label: "Lambda (λ)" },
  { symbol: "°", label: "Gradus" },
  { symbol: "∠", label: "Burchak" },
  { symbol: "△", label: "Uchburchak" },
  { symbol: "□", label: "To'rtburchak" },
  { symbol: "⊥", label: "Perpendicular" },
  { symbol: "∥", label: "Parallel" },
  { symbol: "∈", label: "Element" },
  { symbol: "∉", label: "Element emas" },
  { symbol: "⊂", label: "To'plam" },
  { symbol: "∪", label: "Birlashma" },
  { symbol: "∩", label: "Kesishma" },
  { symbol: "²", label: "Kvadrat" },
  { symbol: "³", label: "Kub" },
  { symbol: "½", label: "Yarim" },
  { symbol: "⅓", label: "Uchdan bir" },
  { symbol: "¼", label: "To'rtdan bir" },
  { symbol: "→", label: "O'ng strelka" },
  { symbol: "←", label: "Chap strelka" },
  { symbol: "↔", label: "Ikki tomonlama" },
  { symbol: "∴", label: "Demak" },
  { symbol: "∵", label: "Chunki" },
];

/** value string → HTML (rasmlarni <img> ga aylantirish) */
function valueToHtml(val: string): string {
  if (!val) return "";
  return val.replace(/\[IMG:([^\]]+)\]/g, '<img src="$1" class="inline-rich-img" contenteditable="false" />');
}

/** HTML → value string (img taglarni [IMG:url] ga aylantirish) */
function htmlToValue(html: string): string {
  const div = document.createElement("div");
  div.innerHTML = html;
  // img taglarni [IMG:src] ga almashtirish
  div.querySelectorAll("img").forEach((img) => {
    const src = img.getAttribute("src") || "";
    const text = document.createTextNode(`[IMG:${src}]`);
    img.parentNode?.replaceChild(text, img);
  });
  // <br> va <div> larni \n ga aylantirish
  let text = div.innerHTML;
  text = text.replace(/<div>/gi, "\n").replace(/<\/div>/gi, "");
  text = text.replace(/<br\s*\/?>/gi, "\n");
  text = text.replace(/<[^>]+>/g, "");
  // HTML entities
  text = text.replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
  return text;
}

export default function RichMathInput({ value, onChange, placeholder, rows = 4, required, label, hint, singleLine }: Props) {
  const [showSymbols, setShowSymbols] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const isInternalChange = useRef(false);

  // value o'zgarganda editor content'ni yangilash (tashqi o'zgarish uchun)
  useEffect(() => {
    if (isInternalChange.current) {
      isInternalChange.current = false;
      return;
    }
    const el = editorRef.current;
    if (!el) return;
    const newHtml = valueToHtml(value);
    if (el.innerHTML !== newHtml) {
      el.innerHTML = newHtml;
    }
  }, [value]);

  // Editor input handler
  function handleInput() {
    const el = editorRef.current;
    if (!el) return;
    isInternalChange.current = true;
    const newValue = htmlToValue(el.innerHTML);
    onChange(newValue);
  }

  // Kursor joyiga matn qo'shish
  function insertAtCursor(text: string) {
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) {
      // Oxiriga qo'shish
      el.innerHTML += text.replace(/\[IMG:([^\]]+)\]/g, '<img src="$1" class="inline-rich-img" contenteditable="false" />');
    } else {
      const range = sel.getRangeAt(0);
      range.deleteContents();
      // Agar rasm bo'lsa img tag, aks holda text node
      if (text.startsWith("[IMG:")) {
        const url = text.replace("[IMG:", "").replace("]", "");
        const img = document.createElement("img");
        img.src = url;
        img.className = "inline-rich-img";
        img.contentEditable = "false";
        range.insertNode(img);
        range.setStartAfter(img);
        range.collapse(true);
      } else {
        const textNode = document.createTextNode(text);
        range.insertNode(textNode);
        range.setStartAfter(textNode);
        range.collapse(true);
      }
      sel.removeAllRanges();
      sel.addRange(range);
    }
    handleInput();
  }

  // Matematik belgi
  function handleSymbolClick(symbol: string) {
    insertAtCursor(symbol);
    setShowSymbols(false);
  }

  // Paste handler — rasm paste bo'lsa upload qilib img qo'yish
  async function handlePaste(e: React.ClipboardEvent) {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (!file) return;
        await uploadImage(file);
        return;
      }
    }
    // Text paste — HTML ni tozalab oddiy text qoldirish
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, text);
  }

  // Rasm upload
  async function uploadImage(file: File) {
    setUploading(true);
    try {
      const fileName = `inline-images/${Date.now()}-${file.name || "paste.png"}`;
      const url = await uploadFile("edukids", fileName, file);
      insertAtCursor(`[IMG:${url}]`);
    } catch (err) {
      console.error("Rasm yuklashda xatolik:", err);
    } finally {
      setUploading(false);
    }
  }

  // Fayl tanlash
  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadImage(file);
    e.target.value = "";
  }

  const minHeight = singleLine ? "36px" : `${(rows || 4) * 24}px`;

  return (
    <div className="relative">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-1 mb-1.5">
        <button
          type="button"
          onClick={() => setShowSymbols(!showSymbols)}
          className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border transition-all ${
            showSymbols ? "border-primary-300 bg-primary-50 text-primary-700" : "border-gray-200 text-gray-600 hover:bg-gray-50"
          }`}
          title="Matematik belgilar"
        >
          <FunctionSquare className="w-3.5 h-3.5" /> Σ Formulalar
        </button>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          title="Rasm qo'shish"
        >
          <ImageIcon className="w-3.5 h-3.5" /> {uploading ? "Yuklanmoqda..." : "Rasm"}
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
      </div>

      {/* Matematik belgilar paneli */}
      {showSymbols && (
        <div className="absolute z-30 left-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg p-3 w-[360px] max-h-[240px] overflow-y-auto" style={{ top: "32px" }}>
          <div className="flex items-center justify-between mb-2 sticky top-0 bg-white pb-2 border-b border-gray-100">
            <p className="text-xs font-medium text-gray-700">Matematik belgilar va LaTeX shablonlar</p>
            <button type="button" onClick={() => setShowSymbols(false)} className="text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-6 gap-1">
            {MATH_SYMBOLS.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => handleSymbolClick(item.symbol)}
                title={item.label}
                className="w-full h-9 flex items-center justify-center text-sm border border-gray-100 rounded-lg hover:bg-primary-50 hover:border-primary-200 hover:text-primary-700 transition-all font-mono"
              >
                {item.symbol.startsWith("$$") ? (
                  <span className="text-[10px] text-gray-600 truncate px-0.5">{item.label.split(" ")[0]}</span>
                ) : (
                  item.symbol
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ContentEditable editor */}
      <div className="relative">
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          onPaste={handlePaste}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className={`w-full px-4 py-2.5 bg-gray-50 border rounded-lg text-sm font-mono overflow-auto whitespace-pre-wrap break-words ${
            isFocused ? "border-primary-400 ring-2 ring-primary-200" : "border-gray-200"
          } ${singleLine ? "overflow-hidden whitespace-nowrap" : ""}`}
          style={{ minHeight, maxHeight: singleLine ? "36px" : "300px" }}
          data-placeholder={placeholder}
        />
        {/* Placeholder */}
        {!value && !isFocused && (
          <div className="absolute left-4 top-2.5 text-sm text-gray-400 pointer-events-none font-mono">
            {placeholder}
          </div>
        )}
      </div>

      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}

      {/* Inline rasm stillari */}
      <style>{`
        .inline-rich-img {
          display: inline-block;
          max-height: 80px;
          max-width: 200px;
          border-radius: 6px;
          border: 1px solid #e5e7eb;
          margin: 2px 4px;
          vertical-align: middle;
          cursor: default;
        }
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}
