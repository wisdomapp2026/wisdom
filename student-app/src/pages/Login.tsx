import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useState } from "react";
import { supabase } from "@shared/supabase";
import { getSafeReturnTo } from "../utils/authRedirect";
import { getAuthRedirectBase, isNativeApp } from "../utils/platform";
import TelegramLoginButton from "../components/TelegramLoginButton";
import LegalModal from "../components/LegalModal";

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = getSafeReturnTo(searchParams.get("returnTo"));
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [legalModal, setLegalModal] = useState<{ open: boolean; type: "terms" | "privacy" }>({ open: false, type: "terms" });
  const [accepted, setAccepted] = useState(false);

  async function handleGoogleLogin() {
    setError("");
    setLoading(true);
    try {
      if (isNativeApp()) {
        // Native app: Custom URL scheme ga redirect qilamiz.
        // OAuth tugaganda brauzer uz.edukids.app://auth/callback#access_token=...
        // ga yo'naltiradi. Android bu URL ni ushlaydi va app'ni ochadi.
        // App.tsx dagi appUrlOpen handler token'ni oladi va session'ni o'rnatadi.
        const redirectUrl = "uz.edukids.app://auth/callback";

        const { data, error: gErr } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: redirectUrl,
            skipBrowserRedirect: true,
          },
        });
        if (gErr) throw gErr;
        if (!data?.url) throw new Error("OAuth URL olinmadi");

        // Tizim brauzerida ochish (Chrome Custom Tab) — u OAuth tugaganda
        // custom scheme'ga redirect qiladi va Android app'ga qaytaradi
        const { Browser } = await import("@capacitor/browser");
        await Browser.open({ url: data.url });
      } else {
        // Web: oddiy redirect
        const { error: gErr } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: getAuthRedirectBase() + returnTo,
          },
        });
        if (gErr) throw gErr;
      }
    } catch (err: any) {
      setError(err.message || "Google bilan kirishda xatolik");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ backgroundColor: 'var(--theme-card-bg)' }}>
      {/* Logo */}
      <div className="w-16 h-16 bg-primary-500 rounded-2xl flex items-center justify-center mb-6">
        <span className="text-white text-2xl">⚡</span>
      </div>
      <h1 className="text-2xl font-bold" style={{ color: 'var(--theme-text)' }}>Xush kelibsiz!</h1>
      <p className="text-sm mt-1 mb-8" style={{ color: 'var(--theme-text-secondary)' }}>O'rganishni davom ettirish uchun kiring</p>

      {/* Google Login */}
      <button
        onClick={handleGoogleLogin}
        disabled={loading}
        className="w-full flex items-center justify-center gap-3 border border-gray-200 rounded-xl py-3.5 bg-white hover:bg-gray-50 active:scale-[0.98] transition-all disabled:opacity-50"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        <span className="text-sm font-semibold text-gray-700">Google bilan kirish</span>
      </button>

      {/* Telegram Login */}
      <div className="w-full mt-3">
        <TelegramLoginButton
          disabled={loading}
          onSuccess={() => navigate(returnTo, { replace: true })}
          onError={(msg) => setError(msg)}
        />
      </div>

      {/* Rozilik matni */}
      <p className="w-full mt-5 text-[11px] text-center leading-relaxed" style={{ color: 'var(--theme-text-secondary)' }}>
        Davom ettirish orqali siz{" "}
        <a
          href="#"
          onClick={(e) => { e.preventDefault(); setLegalModal({ open: true, type: "terms" }); }}
          className="text-primary-500 underline font-medium"
        >
          Foydalanish shartlari
        </a>
        {" "}va{" "}
        <a
          href="#"
          onClick={(e) => { e.preventDefault(); setLegalModal({ open: true, type: "privacy" }); }}
          className="text-primary-500 underline font-medium"
        >
          Maxfiylik siyosati
        </a>
        ga rozilik bildirasiz.
      </p>

      {/* Error */}
      {error && (
        <div className="w-full mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Mehmon sifatida kirish */}
      <Link to={returnTo} className="mt-8 text-sm text-gray-400 font-medium">Mehmon sifatida kirish →</Link>

      {/* Legal Modal */}
      <LegalModal
        open={legalModal.open}
        type={legalModal.type}
        showAccept
        onAccept={() => setAccepted(true)}
        onClose={() => setLegalModal({ ...legalModal, open: false })}
      />
    </div>
  );
}
