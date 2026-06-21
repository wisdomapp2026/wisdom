import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "@shared/firebase";
import { createUser } from "@shared/repositories";

export default function Register() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const cleanPhone = phone.replace(/[^0-9+]/g, "");
    const email = cleanPhone.replace(/[^0-9]/g, "") + "@edukids.uz";

    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);

      // Firestore'da user yaratish
      await createUser({
        id: cred.user.uid,
        phone: cleanPhone,
        name: "O'quvchi",
        role: "student",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      navigate("/");
    } catch (err: any) {
      if (err.code === "auth/email-already-in-use") {
        setError("Bu telefon raqam allaqachon ro'yxatdan o'tgan. Kirish sahifasiga o'ting.");
      } else if (err.code === "auth/weak-password") {
        setError("Parol kamida 6 ta belgidan iborat bo'lishi kerak.");
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen px-5 pt-4 bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <Link to="/login" className="w-11 h-11 flex items-center justify-center rounded-xl text-2xl text-gray-600 hover:bg-gray-100 active:bg-gray-200" aria-label="Orqaga">‹</Link>
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
      <p className="text-center"><Link to="/login" className="font-bold text-primary-500">Kirish</Link></p>

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
