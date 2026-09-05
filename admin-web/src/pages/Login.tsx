import { useState } from "react";
import { BookOpen, Phone, Lock, Eye, EyeOff, AlertCircle, UserPlus, LogIn, CheckCircle2 } from "lucide-react";
import { supabase } from "@shared/supabase";

interface LoginProps {
  onLogin: () => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);

  // Telefon raqamni email formatiga o'tkazish
  function getCandidateEmails(input: string): string[] {
    if (input.includes("@")) {
      return [input.trim()];
    }
    const digits = input.replace(/\D/g, "");
    const phoneDigits = digits.length === 9 ? "998" + digits : digits;
    return [
      `${phoneDigits}@wisdom.uz`,
      `${phoneDigits}@edukids.uz`,
      `${digits}@wisdom.uz`,
      `${digits}@edukids.uz`,
    ];
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setLoading(true);

    const rawInput = identifier.trim();
    if (!rawInput) {
      setError("Telefon raqam yoki emailni kiriting.");
      setLoading(false);
      return;
    }

    try {
      const candidateEmails = getCandidateEmails(rawInput);
      const digits = rawInput.replace(/\D/g, "");
      const formattedPhone = digits ? "+" + (digits.length === 9 ? "998" + digits : digits) : rawInput;

      if (isRegistering) {
        // === YANGI ADMIN YARATISH (Birinchi marta admin hisobi ochish) ===
        const primaryEmail = candidateEmails[0];
        
        // 1. Supabase Auth da ro'yxatdan o'tkazish
        const { data: authData, error: authErr } = await supabase.auth.signUp({
          email: primaryEmail,
          password,
          options: {
            data: {
              name: name.trim() || "Admin",
              phone: formattedPhone,
            },
          },
        });

        if (authErr) throw authErr;

        const userId = authData.user?.id;
        if (userId) {
          // 2. users jadvaliga admin rolida saqlash
          const now = Date.now();
          const { error: profileErr } = await supabase.from("users").upsert({
            id: userId,
            phone: formattedPhone,
            name: name.trim() || "Admin",
            role: "admin",
            created_at: now,
            updated_at: now,
          });

          if (profileErr) {
            console.error("Profile yaratishda xato:", profileErr);
          }
        }

        // Avtomatik kirish
        const { error: signInErr } = await supabase.auth.signInWithPassword({
          email: primaryEmail,
          password,
        });

        if (!signInErr) {
          onLogin();
          return;
        }

        setSuccessMsg("Admin hisobi muvaffaqiyatli yaratildi! Endi kirish tugmasini bosing.");
        setIsRegistering(false);
      } else {
        // === TIZIMGA KIRISH (LOGIN) ===
        let signedIn = false;
        let lastErrorMsg = "";

        for (const emailAttempt of candidateEmails) {
          const { error: attemptErr } = await supabase.auth.signInWithPassword({
            email: emailAttempt,
            password,
          });
          if (!attemptErr) {
            signedIn = true;
            break;
          }
          lastErrorMsg = attemptErr.message;
        }

        if (!signedIn) {
          if (
            lastErrorMsg.includes("Invalid login credentials") ||
            lastErrorMsg.includes("invalid_grant") ||
            lastErrorMsg.includes("User not found")
          ) {
            setError(
              "Foydalanuvchi topilmadi yoki parol noto'g'ri. Yangi Supabase bazangizda hali hisob bo'lmasa, pastdagi 'Yangi Admin hisobini yaratish' tugmasini bosing."
            );
          } else {
            setError("Kirishda xatolik: " + lastErrorMsg);
          }
          return;
        }

        onLogin();
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      const msg = err.message || "";
      if (msg.includes("User already registered")) {
        setError("Bu raqam allaqachon ro'yxatdan o'tgan. 'Kirish' bo'limidan kiring.");
      } else {
        setError("Xatolik: " + msg);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-600/25">
            <BookOpen className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Wisdom Admin</h1>
          <p className="text-sm text-gray-500 mt-1 font-medium">
            {isRegistering ? "Yangi Admin hisobini yaratish" : "Boshqaruv paneliga kirish"}
          </p>
        </div>

        {/* Form Card */}
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 space-y-4"
        >
          {isRegistering && (
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Ismingiz
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50/80 border border-gray-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                placeholder="Masalan: Shoxrux"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Telefon raqam yoki Email
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-50/80 border border-gray-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                placeholder="+998 91 292 92 62"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Parol
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-11 py-3 bg-gray-50/80 border border-gray-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                placeholder="Kamida 6 ta belgi"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3.5 bg-red-50 border border-red-200/80 rounded-2xl flex items-start gap-2.5 text-xs text-red-700 leading-relaxed">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200/80 rounded-2xl flex items-start gap-2.5 text-xs text-emerald-700">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white rounded-2xl font-bold text-sm shadow-lg shadow-indigo-600/25 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              "Bajarilmoqda..."
            ) : isRegistering ? (
              <>
                <UserPlus className="w-4 h-4" />
                Admin hisobini yaratish
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                Kirish →
              </>
            )}
          </button>

          {/* Toggle between Login and Register */}
          <div className="pt-2 text-center border-t border-gray-100">
            {isRegistering ? (
              <button
                type="button"
                onClick={() => {
                  setIsRegistering(false);
                  setError("");
                }}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
              >
                Allaqachon hisobingiz bormi? Kirish
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setIsRegistering(true);
                  setError("");
                }}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
              >
                Yangi Supabase bazasimi? Birinchi marta Admin yaratish
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
