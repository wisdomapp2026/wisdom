import { useState } from "react";
import { supabase } from "@shared/supabase";

interface TelegramLoginButtonProps {
  onSuccess?: () => void;
  onError?: (msg: string) => void;
  disabled?: boolean;
}

import { isNativeApp } from "../utils/platform";

const BOT_USERNAME = import.meta.env.VITE_TELEGRAM_BOT_USERNAME || "edukids_login_bot";
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

type Step = "idle" | "waiting" | "code";

/**
 * Telegram Login — bot orqali telefon raqam + OTP kod.
 * 
 * Oqim:
 * 1. "Telegram bilan kirish" → bot ochiladi
 * 2. Botga Start + telefon raqam ulashadi → bot 4 xonali kod yuboradi
 * 3. App ga qaytib telefon raqam va kodni kiritadi → tizimga kiradi
 */
export default function TelegramLoginButton({ onSuccess, onError, disabled }: TelegramLoginButtonProps) {
  const [step, setStep] = useState<Step>("idle");
  const [code, setCode] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleOpenBot() {
    const botUrl = `https://t.me/${BOT_USERNAME}`;
    if (isNativeApp()) {
      try {
        const { Browser } = await import("@capacitor/browser");
        await Browser.open({ url: botUrl });
      } catch {
        window.open(botUrl, "_blank");
      }
    } else {
      window.open(botUrl, "_blank");
    }
    setStep("waiting");
  }

  async function handleVerifyCode() {
    if (code.length !== 4) {
      setError("4 xonali kodni kiriting");
      return;
    }
    if (!phone.trim()) {
      setError("Telefon raqamingizni kiriting");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (SUPABASE_ANON_KEY) {
        headers["apikey"] = SUPABASE_ANON_KEY;
        headers["Authorization"] = `Bearer ${SUPABASE_ANON_KEY}`;
      }

      const res = await fetch(`${SUPABASE_URL}/functions/v1/telegram-verify-code`, {
        method: "POST",
        headers,
        body: JSON.stringify({ code, phone: phone.trim() }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || "Kodni tekshirishda xatolik");
      }

      if (data.access_token && data.refresh_token) {
        const { error: sessionErr } = await supabase.auth.setSession({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
        });
        if (sessionErr) throw sessionErr;
        // useAuth hook'ga session propagatsiya qilishi uchun biroz kutish
        await new Promise((r) => setTimeout(r, 300));
        onSuccess?.();
      } else {
        throw new Error("Sessiya yaratib bo'lmadi");
      }
    } catch (err: any) {
      setError(err.message || "Xatolik yuz berdi");
      onError?.(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Qadam 1: Telegram botga o'tish tugmasi
  if (step === "idle") {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={handleOpenBot}
        className="w-full flex items-center justify-center gap-3 border border-gray-200 rounded-xl py-3.5 bg-white hover:bg-gray-50 active:scale-[0.98] transition-all disabled:opacity-50"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" fill="#0088cc"/>
        </svg>
        <span className="text-sm font-semibold text-gray-700">Telegram bilan kirish</span>
      </button>
    );
  }

  // Qadam 2: Bot ochildi — yo'riqnoma
  if (step === "waiting") {
    return (
      <div className="border border-blue-200 bg-blue-50 rounded-xl p-4 space-y-3">
        <div className="flex items-start gap-3">
          <span className="text-2xl">🤖</span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-800">Telegram botga o'ting</p>
            <ol className="text-xs text-gray-600 mt-1.5 space-y-1 list-decimal list-inside">
              <li>Botda <strong>"Start"</strong> ni bosing</li>
              <li><strong>"📱 Telefon raqamni ulashish"</strong> tugmasini bosing</li>
              <li>Bot sizga <strong>4 xonali kod</strong> yuboradi</li>
              <li>Shu yerga qaytib kodni kiriting</li>
            </ol>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => window.open(`https://t.me/${BOT_USERNAME}`, "_blank")}
            className="flex-1 py-2.5 text-xs font-medium text-blue-700 bg-blue-100 rounded-lg hover:bg-blue-200 transition-colors"
          >
            🔄 Botni ochish
          </button>
          <button
            type="button"
            onClick={() => { setStep("code"); setError(""); }}
            className="flex-1 py-2.5 text-xs font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-600 transition-colors"
          >
            ✅ Kod oldim
          </button>
        </div>
        <button
          type="button"
          onClick={() => { setStep("idle"); setError(""); setCode(""); setPhone(""); }}
          className="w-full text-xs text-gray-400 hover:text-gray-600 pt-1"
        >
          ← Bekor qilish
        </button>
      </div>
    );
  }

  // Qadam 3: Telefon raqam + Kodni kiritish
  return (
    <div className="border border-blue-200 bg-blue-50 rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">🔑</span>
        <p className="text-sm font-semibold text-gray-800">Tasdiqlash</p>
      </div>

      {/* Telefon raqam */}
      <div>
        <label className="text-xs text-gray-600 font-medium">Telefon raqamingiz</label>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+998 90 123 45 67"
          className="w-full mt-1 px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none bg-white"
        />
      </div>

      {/* Kod */}
      <div>
        <label className="text-xs text-gray-600 font-medium">Bot yuborgan 4 xonali kod</label>
        <input
          type="text"
          inputMode="numeric"
          maxLength={4}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
          placeholder="• • • •"
          className="w-full mt-1 px-3 py-2.5 border border-gray-200 rounded-lg text-center text-xl font-bold tracking-[0.5em] focus:ring-2 focus:ring-primary-500 focus:outline-none bg-white"
          autoFocus
        />
      </div>

      {/* Xato */}
      {error && (
        <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
      )}

      {/* Tasdiqlash */}
      <button
        type="button"
        onClick={handleVerifyCode}
        disabled={loading || code.length !== 4 || !phone.trim()}
        className="w-full py-2.5 text-sm font-semibold text-white bg-primary-500 rounded-lg hover:bg-primary-600 disabled:opacity-50 transition-colors"
      >
        {loading ? "Tekshirilmoqda..." : "Kirish →"}
      </button>

      <button
        type="button"
        onClick={() => { setStep("waiting"); setError(""); setCode(""); }}
        className="w-full text-xs text-gray-400 hover:text-gray-600 pt-1"
      >
        ← Orqaga
      </button>
    </div>
  );
}
