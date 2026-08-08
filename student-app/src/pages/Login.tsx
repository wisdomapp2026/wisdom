import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useState } from "react";
import { supabase } from "@shared/supabase";
import { getAuthPath, getSafeReturnTo } from "../utils/authRedirect";

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = getSafeReturnTo(searchParams.get("returnTo"));
  const registerPath = getAuthPath("/register", returnTo);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    // Telefon raqamni email formatiga o'tkazamiz (Register bilan bir xil qoida)
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 9) {
      setError("Telefon raqamni to'liq kiriting");
      return;
    }
    const email = `${digits}@edukids.uz`;

    setLoading(true);
    try {
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
      if (signInErr) throw signInErr;

      // Auth holati tarqalishi uchun qisqa kutish
      await new Promise((resolve) => setTimeout(resolve, 100));
      navigate(returnTo, { replace: true });
    } catch (err: any) {
      const msg = String(err?.message || "");
      if (msg.includes("Invalid login credentials")) {
        setError("Telefon raqam yoki parol noto'g'ri");
      } else if (msg.includes("Email not confirmed")) {
        setError("Hisob hali tasdiqlanmagan. Administrator bilan bog'laning.");
      } else {
        setError(msg || "Kirishda xatolik yuz berdi");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    setError("");
    setLoading(true);
    try {
      const { error: gErr } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin + returnTo,
        },
      });
      if (gErr) throw gErr;
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
      <p className="text-sm mt-1" style={{ color: 'var(--theme-text-secondary)' }}>O'rganishni davom ettirish uchun kiring</p>

      {/* Google Login */}
      <button
        onClick={handleGoogleLogin}
        disabled={loading}
        className="w-full mt-8 flex items-center justify-center gap-3 border border-gray-200 rounded-xl py-3.5 bg-white hover:bg-gray-50 active:scale-[0.98] transition-all disabled:opacity-50"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        <span className="text-sm font-semibold text-gray-700">Google bilan kirish</span>
      </button>

      {/* Separator */}
      <div className="flex items-center gap-3 my-6 w-full">
        <div className="flex-1 h-px" style={{ backgroundColor: 'var(--theme-text-secondary)', opacity: 0.2 }} />
        <span className="text-xs" style={{ color: 'var(--theme-text-secondary)' }}>yoki telefon bilan</span>
        <div className="flex-1 h-px" style={{ backgroundColor: 'var(--theme-text-secondary)', opacity: 0.2 }} />
      </div>

      {/* Form */}
      <form onSubmit={handleLogin} className="w-full space-y-4">
        {/* Phone */}
        <div>
          <label className="text-sm font-medium" style={{ color: 'var(--theme-text)' }}>Telefon raqam</label>
          <div className="mt-1.5 flex items-center border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3" style={{ backgroundColor: 'var(--theme-bg)' }}>
            <span className="text-gray-400 mr-3">📞</span>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+998 90 123 45 67"
              className="flex-1 outline-none text-base bg-transparent"
              style={{ color: 'var(--theme-text)' }}
              required
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <label className="text-sm font-medium" style={{ color: 'var(--theme-text)' }}>Parol</label>
          <div className="mt-1.5 flex items-center border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3" style={{ backgroundColor: 'var(--theme-bg)' }}>
            <span className="text-gray-400 mr-3">🔒</span>
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="********"
              className="flex-1 outline-none text-base bg-transparent"
              style={{ color: 'var(--theme-text)' }}
              required
              minLength={6}
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="w-10 h-10 flex items-center justify-center text-gray-400 rounded-lg" aria-label={showPassword ? "Parolni yashirish" : "Parolni ko'rsatish"}>
              {showPassword ? "🙈" : "👁"}
            </button>
          </div>
          <p className="text-right mt-1.5">
            <button type="button" className="text-sm text-primary-500 font-medium">Parolni unutdingizmi?</button>
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Login button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary-500 text-white font-bold py-3.5 rounded-xl text-base mt-2 disabled:opacity-50"
        >
          {loading ? "Kuting..." : "Kirish  →"}
        </button>
      </form>

      {/* Register link */}
      <p className="text-sm text-gray-500 mt-8">Hisobingiz yo'qmi?</p>
      <Link to={registerPath} className="text-base font-bold text-primary-500 mt-1">Ro'yxatdan o'tish</Link>

      {/* Mehmon sifatida kirish */}
      <Link to={returnTo} className="mt-6 text-sm text-gray-400 font-medium">Mehmon sifatida kirish →</Link>
    </div>
  );
}
