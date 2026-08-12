import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
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
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (open) {
      setClosing(false);
      loadContent();
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
    };
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
    return `${d.getDate()}-${months[d.getMonth()]}, ${d.getFullYear()}`;
  }

  function handleClose() {
    setClosing(true);
    setTimeout(() => {
      setClosing(false);
      onClose();
    }, 200);
  }

  if (!open) return null;

  return createPortal(
    <div
      className={`fixed inset-0 z-[200] flex items-center justify-center p-4 transition-opacity duration-200 ${closing ? "opacity-0" : "opacity-100"}`}
      style={{ animation: closing ? undefined : "legalFadeIn 0.2s ease-out" }}
    >
      {/* Backdrop — blur + dim */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal karta */}
      <div
        className={`relative w-full max-w-lg bg-white rounded-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden transition-all duration-200 ${closing ? "scale-95 opacity-0" : ""}`}
        style={{ animation: closing ? undefined : "legalScaleIn 0.28s cubic-bezier(0.34,1.56,0.64,1)" }}
      >
        {/* Header — gradient accent */}
        <div className="relative px-6 pt-6 pb-4 shrink-0">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary-400 via-primary-500 to-indigo-500 rounded-t-3xl" />
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                {type === "terms" ? "📋 Foydalanish shartlari" : "🔒 Maxfiylik siyosati"}
              </h2>
              {updatedAt && (
                <p className="text-[11px] text-gray-400 mt-1">
                  Yangilangan: {formatDate(updatedAt)}
                </p>
              )}
            </div>
            <button
              onClick={handleClose}
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700 transition-colors shrink-0"
            >
              <X size={17} />
            </button>
          </div>
        </div>

        {/* Content — scrollable */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-6 pb-4">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-[3px] border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : content ? (
            <div className="text-[13.5px] text-gray-700 leading-[1.8] whitespace-pre-wrap break-words">
              {content}
            </div>
          ) : (
            <div className="py-16 text-center">
              <p className="text-3xl mb-2">📄</p>
              <p className="text-sm text-gray-400">Hujjat matni hali kiritilmagan</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 shrink-0 flex gap-3 bg-gray-50/50">
          <button
            onClick={handleClose}
            className={`${showAccept ? "flex-1" : "w-full"} border border-gray-200 bg-white text-gray-700 font-semibold py-3 rounded-xl text-sm hover:bg-gray-50 active:scale-[0.98] transition-all`}
          >
            Tushunarli
          </button>
          {showAccept && (
            <button
              onClick={() => { onAccept?.(); handleClose(); }}
              className="flex-1 bg-primary-500 text-white font-semibold py-3 rounded-xl text-sm hover:bg-primary-600 active:scale-[0.98] transition-all shadow-lg shadow-primary-500/25"
            >
              Roziman
            </button>
          )}
        </div>
      </div>

      {/* Keyframe animatsiyalar */}
      <style>{`
        @keyframes legalFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes legalScaleIn {
          from { opacity: 0; transform: scale(0.92) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>,
    document.body
  );
}
