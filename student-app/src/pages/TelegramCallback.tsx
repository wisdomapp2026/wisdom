import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@shared/supabase";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://qplqvhmkhpgrvksboepf.supabase.co";

/**
 * Telegram Login callback sahifasi.
 * Telegram widget foydalanuvchi ma'lumotlarini URL hash yoki query params orqali qaytaradi.
 * Bu sahifa ularni edge function ga yuborib sessiya oladi.
 */
export default function TelegramCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState(true);

  useEffect(() => {
    handleTelegramCallback();
  }, []);

  async function handleTelegramCallback() {
    try {
      // Telegram URL dan parametrlarni olish
      const id = searchParams.get("id");
      const first_name = searchParams.get("first_name") || "";
      const last_name = searchParams.get("last_name") || "";
      const username = searchParams.get("username") || "";
      const photo_url = searchParams.get("photo_url") || "";
      const auth_date = searchParams.get("auth_date") || "";
      const hash = searchParams.get("hash") || "";

      if (!id || !hash) {
        setError("Telegram ma'lumotlari topilmadi");
        setProcessing(false);
        return;
      }

      // Edge function ga yuborish
      const res = await fetch(`${SUPABASE_URL}/functions/v1/telegram-auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, first_name, last_name, username, photo_url, auth_date, hash }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || "Telegram orqali kirishda xatolik");
      }

      if (data.access_token && data.refresh_token) {
        // Sessiyani o'rnatish
        const { error: sessionErr } = await supabase.auth.setSession({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
        });
        if (sessionErr) throw sessionErr;
        navigate("/", { replace: true });
      } else {
        throw new Error(data.error || "Telegram sessiyasini yaratib bo'lmadi");
      }
    } catch (err: any) {
      setError(err.message || "Xatolik yuz berdi");
      setProcessing(false);
    }
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 max-w-sm w-full text-center">
          <span className="text-3xl">❌</span>
          <p className="text-red-600 mt-3 font-medium">{error}</p>
          <button
            onClick={() => navigate("/login", { replace: true })}
            className="mt-4 text-primary-500 font-semibold text-sm"
          >
            ← Login sahifasiga qaytish
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="flex flex-col items-center gap-3">
        <div className="w-12 h-12 border-[3px] border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-500">Telegram orqali kirilmoqda...</p>
      </div>
    </div>
  );
}
