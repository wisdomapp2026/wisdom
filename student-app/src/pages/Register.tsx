import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useState } from "react";
import { supabase } from "@shared/supabase";
import { createUser } from "@shared/repositories";
import { getAuthPath, getSafeReturnTo } from "../utils/authRedirect";

export default function Register() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = getSafeReturnTo(searchParams.get("returnTo"));
  const loginPath = getAuthPath("/login", returnTo);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    // Telefon raqamni normallashtirish: faqat raqamlar
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 9) {
      setError("Telefon raqamni to'liq kiriting");
      return;
    }
    // Login bilan bir xil format: raqamlar + @edukids.uz
    const email = `${digits}@edukids.uz`;
    const normalizedPhone = `+${digits}`;

    setLoading(true);
    try {
      const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name: name.trim() || "O'quvchi" },
        },
      });
      if (signUpErr) throw signUpErr;
      if (!signUpData.user) throw new Error("Foydalanuvchi yaratib bo'lmadi");

      // `users` jadvalida profil yaratish
      await createUser({
        id: signUpData.user.id,
        phone: normalizedPhone,
        name: name.trim() || "O'quvchi",
        role: "student",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Email tasdiqlash yoqilgan bo'lsa sessiya bo'lmaydi — login sahifasiga yuboramiz
      if (!signUpData.session) {
        navigate(loginPath, { replace: true });
        return;
      }

      navigate(returnTo, { replace: true });
    } catch (err: any) {
      const msg = String(err?.message || "");
      if (msg.includes("already registered") || msg.includes("User already registered")) {
        setError("Bu telefon raqam allaqachon ro'yxatdan o'tgan. Kirish sahifasidan foydalaning.");
      } else if (msg.includes("Password should be at least")) {
        setError("Parol kamida 6 ta belgidan iborat bo'lishi kerak");
      } else {
        setError(msg || "Ro'yxatdan o'tishda xatolik yuz berdi");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen px-5 pt-4 bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <Link to={loginPath} className="w-11 h-11 flex items-center justify-center rounded-xl text-2xl text-gray-600 hover:bg-gray-100 active:bg-gray-200" aria-label="Orqaga">‹</Link>
        <h1 className="text-lg font-bold">Ro'yxatdan o'tish</h1>
      </div>
      <div className="h-1 bg-primary-500 -mx-5 mb-8" />

      {/* Logo */}
      <div className="flex flex-col items-center mb-6">
        <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center">
          <span className="text-primary-500 text-2xl">⚡</span>
        </div>
        <p className="text-sm text-gray-500 text-center mt-4">
          Farzandingiz kelajagi uchun yangi<br/>bilimlar olamiga qo'shiling
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleRegister} className="space-y-4">
        {/* Google bilan */}
        <button
          type="button"
          onClick={async () => {
            const { error: gErr } = await supabase.auth.signInWithOAuth({
              provider: "google",
              options: { redirectTo: window.location.origin + returnTo },
            });
            if (gErr) setError(gErr.message);
          }}
          className="w-full flex items-center justify-center gap-3 border border-gray-200 rounded-xl py-3.5 bg-white hover:bg-gray-50 active:scale-[0.98] transition-all"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          <span className="text-sm font-semibold text-gray-700">Google bilan ro'yxatdan o'tish</span>
        </button>

        {/* Separator */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-gray-400">yoki telefon bilan</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>
        {/* Ism */}
        <div>
          <label className="text-sm font-semibold" htmlFor="reg-name">Ismingiz</label>
          <div className="mt-1.5 flex items-center border border-gray-200 rounded-xl px-4 py-3">
            <span className="text-gray-400 mr-3">👤</span>
            <input
              id="reg-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ism Familiya"
              className="flex-1 outline-none"
              autoComplete="name"
            />
          </div>
        </div>

        {/* Phone */}
        <div>
          <label className="text-sm font-semibold">Telefon raqam</label>
          <div className="mt-1.5 flex items-center border border-gray-200 rounded-xl px-4 py-3">
            <span className="text-gray-400 mr-3">📞</span>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+998 90 123 45 67"
              className="flex-1 outline-none"
              required
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <label className="text-sm font-semibold">Parol</label>
          <div className="mt-1.5 flex items-center border border-gray-200 rounded-xl px-4 py-3">
            <span className="text-gray-400 mr-3">🔒</span>
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Kamida 8 ta belgi"
              className="flex-1 outline-none"
              required
              minLength={6}
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="w-10 h-10 flex items-center justify-center text-gray-400 rounded-lg" aria-label={showPassword ? "Parolni yashirish" : "Parolni ko'rsatish"}>
              {showPassword ? "🙈" : "👁"}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Register button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary-500 text-white font-bold py-3.5 rounded-xl disabled:opacity-50"
        >
          {loading ? "Yaratilmoqda..." : "Ro'yxatdan o'tish  →"}
        </button>
      </form>

      {/* Login link */}
      <p className="text-center mt-6 text-sm text-gray-500">Profilingiz bormi?</p>
      <p className="text-center"><Link to={loginPath} className="font-bold text-primary-500">Kirish</Link></p>

      {/* Security */}
      <div className="mt-8 bg-blue-50 border border-blue-100 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <span className="text-primary-500">🛡️</span>
          <div>
            <p className="text-sm font-bold uppercase">Xavfsizlik kafolati</p>
            <p className="text-xs text-gray-600 mt-1">
              Tugmani bosish orqali siz bizning{" "}
              <span className="text-primary-500 underline">Foydalanish shartlari</span> va{" "}
              <span className="text-primary-500 underline">Maxfiylik siyosati</span>ga rozilik bildirasiz.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
