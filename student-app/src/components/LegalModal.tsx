import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { supabase } from "@shared/supabase";

interface LegalModalProps {
  open: boolean;
  type: "terms" | "privacy";
  onClose: () => void;
  /** Rozilik tugmasi ko'rsatilsinmi (login/register oldida) */
  showAccept?: boolean;
  /** Roziman bosilganda */
  onAccept?: () => void;
}

export default function LegalModal({ open, type, onClose, showAccept, onAccept }: LegalModalProps) {
  const [content, setContent] = useState("");
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open) {
      loadContent();
    }
  }, [open, type]);

  async function loadContent() {
    setLoading(true);
    try {
      const key = type === "terms" ? "legal_terms" : "legal_privacy";
      const { data } = await supabase
        .from("settings")
        .select("value")
        .eq("key", key)
        .maybeSingle();

      if (data?.value) {
        const val = data.value as any;
        setContent(typeof val === "string" ? val : val.content || "");
        setUpdatedAt(typeof val === "object" && val.updatedAt ? val.updatedAt : null);
      } else {
        setContent("");
        setUpdatedAt(null);
      }
    } catch {
      setContent("");
      setUpdatedAt(null);
    } finally {
      setLoading(false);
    }
  }

  function formatDate(ts: number): string {
    const d = new Date(ts);
    const months = ["yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avgust", "sentyabr", "oktyabr", "noyabr", "dekabr"];
    return `${d.getFullYear()}-yil, ${d.getDate()}-${months[d.getMonth()]}`;
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-3">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal — ekranga mos */}
      <div className="relative w-full max-w-md bg-white rounded-2xl max-h-[88vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100 shrink-0">
          <h2 className="text-base font-bold text-gray-900 pr-2">
            {type === "terms" ? "Foydalanish shartlari" : "Maxfiylik siyosati"}
          </h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 shrink-0">
            <X size={18} />
          </button>
        </div>

        {/* Content — scrollable */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-3">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-[3px] border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : content ? (
            <>
              {updatedAt && (
                <p className="text-xs text-gray-400 mb-3 pb-3 border-b border-gray-100">
                  Oxirgi yangilanish: {formatDate(updatedAt)}
                </p>
              )}
              <div className="text-[13px] text-gray-700 leading-relaxed whitespace-pre-wrap break-words">
                {content}
              </div>
            </>
          ) : (
            <div className="py-12 text-center">
              <p className="text-3xl mb-2">📄</p>
              <p className="text-sm text-gray-400">Hujjat matni hali kiritilmagan</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-100 shrink-0 flex gap-2">
          <button
            onClick={onClose}
            className={`${showAccept ? "flex-1" : "w-full"} border border-gray-200 text-gray-600 font-medium py-2.5 rounded-xl text-sm active:bg-gray-50`}
          >
            Tushunarli
          </button>
          {showAccept && (
            <button
              onClick={() => { onAccept?.(); onClose(); }}
              className="flex-1 bg-primary-500 text-white font-semibold py-2.5 rounded-xl text-sm active:scale-[0.98] transition-transform"
            >
              Roziman
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
