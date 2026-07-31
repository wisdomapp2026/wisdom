import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@shared/firebase";
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
    setLoading(true);

    // Telefon raqamni email formatga o'tkazamiz (Firebase Phone Auth uchun keyinchalik)
    const email = phone.replace(/[^0-9]/g, "") + "@edukids.uz";

    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate(returnTo, { replace: true });
    } catch (err: any) {
      if (err.code === "auth/invalid-credential" || err.code === "auth/user-not-found") {
        setError("Telefon raqam yoki parol noto'g'ri. Ro'yxatdan o'ting.");
      } else if (err.code === "auth/too-many-requests") {
        setError("Juda ko'p urinish. Biroz kutib qayta urinib ko'ring.");
      } else {
        setError(err.message);
      }
    } finally {
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

      {/* Form */}
      <form onSubmit={handleLogin} className="w-full mt-8 space-y-4">
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

      {/* Separator */}
      <div className="flex items-center gap-3 my-8 w-full">
        <div className="flex-1 h-px" style={{ backgroundColor: 'var(--theme-text-secondary)', opacity: 0.2 }} />
        <span className="text-sm" style={{ color: 'var(--theme-text-secondary)' }}>YOKI</span>
        <div className="flex-1 h-px" style={{ backgroundColor: 'var(--theme-text-secondary)', opacity: 0.2 }} />
      </div>

      {/* Register link */}
      <p className="text-sm text-gray-500">Hisobingiz yo'qmi?</p>
      <Link to={registerPath} className="text-base font-bold text-primary-500 mt-1">Ro'yxatdan o'tish</Link>

      {/* Mehmon sifatida kirish */}
      <Link to={returnTo} className="mt-6 text-sm text-gray-400 font-medium">Mehmon sifatida kirish →</Link>
    </div>
  );
}
