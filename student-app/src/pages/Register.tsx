import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useState } from "react";
import { supabase } from "@shared/supabase";
import { getAuthPath, getSafeReturnTo } from "../utils/authRedirect";
import { getAuthRedirectBase, isNativeApp } from "../utils/platform";
import TelegramLoginButton from "../components/TelegramLoginButton";
import LegalModal from "../components/LegalModal";

export default function Register() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = getSafeReturnTo(searchParams.get("returnTo"));
  const loginPath = getAuthPath("/login", returnTo);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [legalModal, setLegalModal] = useState<{ open: boolean; type: "terms" | "privacy" }>({ open: false, type: "terms" });

  return (
    <div className="min-h-screen px-5 pt-4 bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <Link to={loginPath} className="w-11 h-11 flex items-center justify-center rounded-xl text-2xl text-gray-600 hover:bg-gray-100 active:bg-gray-200" aria-label="Orqaga">‹</Link>
        <h1 className="text-lg font-bold">Ro'yxatdan o'tish</h1>
      </div>
      <div className="h-1 bg-primary-500 -mx-5 mb-8" />

      {/* Logo */}
      <div className="flex flex-col items-center mb-8">
        <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center">
          <span className="text-primary-500 text-2xl">⚡</span>
        </div>
        <p className="text-sm text-gray-500 text-center mt-4">
          Farzandingiz kelajagi uchun yangi<br/>bilimlar olamiga qo'shiling
        </p>
      </div>

      {/* Google bilan */}
      <div className="space-y-3">
        <button
          type="button"
          disabled={loading}
          onClick={async () => {
            setLoading(true);
            if (isNativeApp()) {
              const redirectUrl = "uz.edukids.app://auth/callback";
              const { data, error: gErr } = await supabase.auth.signInWithOAuth({
                provider: "google",
                options: { redirectTo: redirectUrl, skipBrowserRedirect: true },
              });
              if (gErr) { setError(gErr.message); setLoading(false); return; }
              if (data?.url) {
                const { Browser } = await import("@capacitor/browser");
                await Browser.open({ url: data.url });
              }
            } else {
              const { error: gErr } = await supabase.auth.signInWithOAuth({
                provider: "google",
                options: { redirectTo: getAuthRedirectBase() + returnTo },
              });
              if (gErr) setError(gErr.message);
              setLoading(false);
            }
          }}
          className="w-full flex items-center justify-center gap-3 border border-gray-200 rounded-xl py-3.5 bg-white hover:bg-gray-50 active:scale-[0.98] transition-all disabled:opacity-50"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          <span className="text-sm font-semibold text-gray-700">Google bilan ro'yxatdan o'tish</span>
        </button>

        {/* Telegram Login */}
        <TelegramLoginButton
          disabled={loading}
          onSuccess={() => navigate(returnTo, { replace: true })}
          onError={(msg) => setError(msg)}
        />
      </div>

      {/* Error */}
      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Login link */}
      <p className="text-center mt-8 text-sm text-gray-500">Profilingiz bormi?</p>
      <p className="text-center"><Link to={loginPath} className="font-bold text-primary-500">Kirish</Link></p>

      {/* Mehmon */}
      <p className="text-center mt-6">
        <Link to={returnTo} className="text-sm text-gray-400 font-medium">Mehmon sifatida kirish →</Link>
      </p>

      {/* Rozilik matni */}
      <p className="mt-6 text-[11px] text-center text-gray-500 leading-relaxed px-2">
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

      {/* Legal Modal */}
      <LegalModal
        open={legalModal.open}
        type={legalModal.type}
        showAccept
        onClose={() => setLegalModal({ ...legalModal, open: false })}
      />
    </div>
  );
}
