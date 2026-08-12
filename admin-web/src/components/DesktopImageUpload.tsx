import { useEffect, useRef, useState } from "react";
import { Monitor, Pencil, Trash2, ImageIcon, AlertTriangle, CheckCircle2 } from "lucide-react";

/**
 * DESKTOP rasm yuklash bloki.
 *
 * Nima uchun kerak: student app'ning mobil va desktop versiyalari bir xil
 * kontentni ko'rsatadi, lekin ekran o'lchamlari juda farq qiladi. Mobil uchun
 * yuklangan kichik rasm (masalan 800×450) katta monitorda xiralashadi.
 * Shu sababli admin desktop uchun alohida, kattaroq rasm yuklashi mumkin.
 *
 * Desktop rasmi yuklanmasa — student app avtomatik mobil rasmni ishlatadi.
 */

export interface DesktopImageUploadProps {
  /** Ko'rinadigan sarlavha */
  label?: string;
  /** Hozirgi rasm URL yoki preview (objectURL) */
  preview: string;
  /** Rasm tanlanganda */
  onFileSelect: (file: File) => void;
  /** Rasmni o'chirish */
  onClear: () => void;
  /** Tavsiya etiladigan o'lcham (px) */
  recommended: { width: number; height: number };
  /** Mobil variantining o'lchami — taqqoslash uchun ko'rsatiladi */
  mobileRecommended?: { width: number; height: number };
  /** Preview blokining nisbati, masalan "16 / 9" */
  aspectRatio?: string;
  /** Qo'shimcha izoh */
  hint?: string;
  /** Object-fit qiymati (preview uchun) */
  fit?: "cover" | "contain";
  /** Object-position qiymati (preview uchun) */
  position?: string;
}

export default function DesktopImageUpload({
  label = "Desktop versiyasi uchun rasm",
  preview,
  onFileSelect,
  onClear,
  recommended,
  mobileRecommended,
  aspectRatio = "16 / 9",
  hint,
  fit = "cover",
  position = "50% 50%",
}: DesktopImageUploadProps) {
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);
  const [fileSizeKb, setFileSizeKb] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Yuklangan rasmning haqiqiy o'lchamini aniqlash (tavsiya bilan taqqoslash uchun)
  useEffect(() => {
    if (!preview) {
      setDims(null);
      return;
    }
    let cancelled = false;
    const img = new window.Image();
    img.onload = () => {
      if (!cancelled) setDims({ w: img.naturalWidth, h: img.naturalHeight });
    };
    img.onerror = () => {
      if (!cancelled) setDims(null);
    };
    img.src = preview;
    return () => {
      cancelled = true;
    };
  }, [preview]);

  const ratioTarget = recommended.width / recommended.height;
  const ratioActual = dims ? dims.w / dims.h : null;

  // Sifat bahosi: kenglik tavsiyadan kamida 85% bo'lsa yetarli
  const widthOk = dims ? dims.w >= recommended.width * 0.85 : null;
  const ratioOk = ratioActual !== null ? Math.abs(ratioActual - ratioTarget) / ratioTarget < 0.12 : null;

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileSizeKb(Math.round(file.size / 1024));
    onFileSelect(file);
    // Bir xil faylni qayta tanlash imkoniyati uchun inputni tozalaymiz
    e.target.value = "";
  }

  return (
    <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-4 space-y-3">
      {/* Sarlavha */}
      <div className="flex items-start gap-2.5">
        <span className="w-8 h-8 rounded-lg bg-indigo-100 grid place-items-center shrink-0">
          <Monitor className="w-4 h-4 text-indigo-600" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-indigo-900">{label}</p>
          <p className="text-[11px] text-indigo-600/80 mt-0.5">
            Bo'sh qoldirilsa — desktopda mobil rasm ishlatiladi
          </p>
        </div>
      </div>

      {/* O'lcham talablari */}
      <div className="rounded-lg bg-white border border-indigo-100 px-3.5 py-3 space-y-1.5">
        <p className="text-[11px] font-bold uppercase tracking-wide text-indigo-700">
          📐 Yuklash uchun o'lchamlar
        </p>
        <div className="flex flex-wrap gap-x-5 gap-y-1">
          <span className="text-[12px] text-gray-700">
            🖥 <strong>Desktop:</strong>{" "}
            <code className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 font-mono font-semibold">
              {recommended.width}×{recommended.height} px
            </code>
          </span>
          {mobileRecommended && (
            <span className="text-[12px] text-gray-500">
              📱 <strong>Mobil:</strong>{" "}
              <code className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 font-mono">
                {mobileRecommended.width}×{mobileRecommended.height} px
              </code>
            </span>
          )}
        </div>
        <p className="text-[11px] text-gray-400">
          Nisbat {simplifyRatio(recommended.width, recommended.height)} · format PNG / JPG / WebP ·
          hajmi 500 KB dan oshmasligi tavsiya etiladi (tez yuklanish uchun)
        </p>
        {hint && <p className="text-[11px] text-gray-500">{hint}</p>}
      </div>

      {/* Preview yoki yuklash maydoni */}
      {preview ? (
        <div className="space-y-2.5">
          <div
            className="rounded-lg overflow-hidden bg-gray-900 border border-indigo-100 relative"
            style={{ aspectRatio }}
          >
            <img
              src={preview}
              alt=""
              className="w-full h-full"
              style={{ objectFit: fit, objectPosition: position }}
              draggable={false}
            />
            <span className="absolute top-2 left-2 text-[10px] font-bold text-white bg-black/60 backdrop-blur-sm px-2 py-1 rounded">
              🖥 Desktop ko'rinishi
            </span>
          </div>

          {/* Tekshiruv natijasi */}
          {dims && (
            <div className="flex flex-wrap items-center gap-2">
              <Badge ok={widthOk}>
                {dims.w}×{dims.h} px
                {widthOk === false && ` (tavsiya: ${recommended.width}×${recommended.height})`}
              </Badge>
              <Badge ok={ratioOk}>
                Nisbat {simplifyRatio(dims.w, dims.h)}
                {ratioOk === false && ` (kerak: ${simplifyRatio(recommended.width, recommended.height)})`}
              </Badge>
              {fileSizeKb !== null && (
                <Badge ok={fileSizeKb <= 500}>
                  {fileSizeKb} KB{fileSizeKb > 500 && " — siqishni tavsiya qilamiz"}
                </Badge>
              )}
            </div>
          )}

          <div className="flex items-center gap-2">
            <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-600 cursor-pointer hover:bg-gray-50">
              <Pencil className="w-3.5 h-3.5" /> Almashtirish
              <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleChange} />
            </label>
            <button
              type="button"
              onClick={() => {
                setDims(null);
                setFileSizeKb(null);
                onClear();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-500 hover:text-red-500 hover:bg-red-50"
            >
              <Trash2 className="w-3.5 h-3.5" /> O'chirish
            </button>
          </div>
        </div>
      ) : (
        <label
          className="flex flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-indigo-300 bg-white/60 cursor-pointer hover:border-indigo-400 hover:bg-white transition-colors"
          style={{ aspectRatio, maxHeight: 220 }}
        >
          <ImageIcon className="w-7 h-7 text-indigo-300" />
          <span className="text-sm font-medium text-indigo-700">Desktop rasmini tanlash</span>
          <span className="text-[11px] text-indigo-500/80 font-mono">
            {recommended.width}×{recommended.height} px
          </span>
          <input type="file" accept="image/*" className="hidden" onChange={handleChange} />
        </label>
      )}
    </div>
  );
}

function Badge({ ok, children }: { ok: boolean | null; children: React.ReactNode }) {
  const tone =
    ok === null
      ? "bg-gray-100 text-gray-500"
      : ok
      ? "bg-green-50 text-green-700 border border-green-200"
      : "bg-amber-50 text-amber-700 border border-amber-200";
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-md ${tone}`}>
      {ok === true && <CheckCircle2 className="w-3 h-3" />}
      {ok === false && <AlertTriangle className="w-3 h-3" />}
      {children}
    </span>
  );
}

/** 1600×900 → "16:9" */
function simplifyRatio(w: number, h: number): string {
  const g = gcd(w, h);
  let a = Math.round(w / g);
  let b = Math.round(h / g);
  // Juda katta sonlarni yaqin standart nisbatga keltirish
  if (a > 30 || b > 30) {
    const r = w / h;
    const known: Array<[number, number]> = [
      [16, 9],
      [3, 1],
      [4, 3],
      [3, 4],
      [1, 1],
      [8, 11],
      [21, 9],
    ];
    let best = known[0];
    let bestDiff = Infinity;
    for (const [ka, kb] of known) {
      const diff = Math.abs(r - ka / kb);
      if (diff < bestDiff) {
        bestDiff = diff;
        best = [ka, kb];
      }
    }
    [a, b] = best;
  }
  return `${a}:${b}`;
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}
