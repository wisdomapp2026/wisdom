import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

/**
 * Telegram Bot Webhook Handler
 * 
 * Oqim:
 * 1. Foydalanuvchi botga /start yuboradi → telefon raqam so'raladi
 * 2. Foydalanuvchi telefon raqamini ulashadi → 4 xonali kod yaratilib yuboriladi
 * 3. Kod `telegram_codes` jadvalida saqlanadi (5 daqiqa amal qiladi)
 * 4. Client `telegram-verify-code` endpoint ga kodni yuboradi va sessiya oladi
 */
serve(async (req) => {
  try {
    const update = await req.json();

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const text = (update.message?.text || "").trim();
    const isStart = text === "/start" || text.startsWith("/start ") || text.startsWith("/start@");

    // /start buyrug'i
    if (isStart) {
      const chatId = update.message.chat.id;
      const firstName = update.message.from?.first_name || "Foydalanuvchi";

      await sendMessage(chatId, 
        `Salom, ${firstName}! 👋\n\n` +
        `EduKids platformasiga kirish uchun telefon raqamingizni yuboring.\n\n` +
        `📱 Pastdagi "Telefon raqamni ulashish" tugmasini bosing:`,
        {
          reply_markup: {
            keyboard: [[{ text: "📱 Telefon raqamni ulashish", request_contact: true }]],
            resize_keyboard: true,
            one_time_keyboard: true,
          },
        }
      );
      return new Response("OK");
    }

    // Telefon raqam ulashilganda (contact)
    if (update.message?.contact) {
      const chatId = update.message.chat.id;
      const contact = update.message.contact;
      const telegramId = String(update.message.from.id);
      const phone = contact.phone_number.startsWith("+") 
        ? contact.phone_number 
        : `+${contact.phone_number}`;
      const firstName = contact.first_name || update.message.from?.first_name || "";
      const lastName = contact.last_name || update.message.from?.last_name || "";
      const username = update.message.from?.username || "";

      // Telegram profil rasmini olish
      let photoUrl = "";
      try {
        const photosRes = await fetch(`${TELEGRAM_API}/getUserProfilePhotos?user_id=${telegramId}&limit=1`);
        const photosData = await photosRes.json();
        if (photosData.ok && photosData.result?.total_count > 0) {
          const fileId = photosData.result.photos[0][photosData.result.photos[0].length - 1].file_id;
          const fileRes = await fetch(`${TELEGRAM_API}/getFile?file_id=${fileId}`);
          const fileData = await fileRes.json();
          if (fileData.ok && fileData.result?.file_path) {
            photoUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${fileData.result.file_path}`;
          }
        }
      } catch (e) {
        console.warn("Profil rasmini olishda xatolik:", e);
      }

      // 4 xonali tasdiqlash kodi yaratish
      const code = String(Math.floor(1000 + Math.random() * 9000));
      const expiresAt = Date.now() + 5 * 60 * 1000; // 5 daqiqa

      // Kodni DB ga saqlash
      // Avvalgi kodlarni o'chirish (shu telegram_id uchun)
      await supabase
        .from("telegram_codes")
        .delete()
        .eq("telegram_id", telegramId);

      await supabase
        .from("telegram_codes")
        .insert({
          telegram_id: telegramId,
          phone,
          code,
          first_name: firstName,
          last_name: lastName,
          username,
          photo_url: photoUrl,
          expires_at: expiresAt,
          used: false,
        });

      // Kodni foydalanuvchiga yuborish
      await sendMessage(chatId,
        `✅ Telefon raqamingiz qabul qilindi!\n\n` +
        `📱 Raqam: ${phone}\n\n` +
        `🔑 Sizning tasdiqlash kodingiz:\n\n` +
        `    ╔══════════╗\n` +
        `    ║   ${code}   ║\n` +
        `    ╚══════════╝\n\n` +
        `⏱ Kod 5 daqiqa amal qiladi.\n\n` +
        `👉 Brauzeringizga qaytib, shu kodni kiriting.`,
        {
          reply_markup: { remove_keyboard: true },
        }
      );

      return new Response("OK");
    }

    // Boshqa xabarlar
    if (text && !isStart) {
      const chatId = update.message.chat.id;
      await sendMessage(chatId,
        `EduKids platformasiga kirish uchun pastdagi "Telefon raqamni ulashish" tugmasini bosing yoki /start ni bosing.`,
        {
          reply_markup: {
            keyboard: [[{ text: "📱 Telefon raqamni ulashish", request_contact: true }]],
            resize_keyboard: true,
            one_time_keyboard: true,
          },
        }
      );
      return new Response("OK");
    }

    return new Response("OK");
  } catch (err: any) {
    console.error("Bot webhook error:", err);
    return new Response("OK"); // Telegram 200 kutadi
  }
});

async function sendMessage(chatId: number | string, text: string, extra?: Record<string, any>) {
  try {
    const res = await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        ...extra,
      }),
    });
    if (!res.ok) {
      const errBody = await res.text();
      console.error(`Telegram sendMessage failed (${res.status}):`, errBody);
    }
  } catch (e) {
    console.error("Telegram sendMessage error:", e);
  }
}

