/**
 * EduKids Telegram Bot Runner & Diagnostic Tool
 * 
 * Ushbu skript botni mahalliy (local) sinash, diagnostika qilish yoki 
 * Telegram Webhook ni o'rnatish uchun mo'ljallangan.
 * 
 * Ishlatish usullari:
 * 1. Diagnostika va status tekshirish:
 *    node shared/scripts/bot-runner.mjs --status
 * 
 * 2. Supabase Edge Function Webhook'ini o'rnatish (Production uchun):
 *    node shared/scripts/bot-runner.mjs --set-webhook
 * 
 * 3. Mahalliy Long-Polling orqali botni ishga tushirish (Local test uchun):
 *    node shared/scripts/bot-runner.mjs
 */

import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../../.env") });

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://ybltddehavbczcwvyjrt.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const WEBHOOK_URL = `${SUPABASE_URL}/functions/v1/telegram-bot`;
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

const args = process.argv.slice(2);

async function checkBot() {
  if (!BOT_TOKEN) {
    console.error("❌ Xatolik: .env faylda TELEGRAM_BOT_TOKEN topilmadi!");
    console.log("\n💡 Yangi bot token olish tartibi:");
    console.log("1. Telegram da @BotFather botini oching");
    console.log("2. /mybots buyrug'ini yuboring va botingizni tanlang (masalan, @edukids_login_bot)");
    console.log("3. 'API Token' ni bosing (agar kerak bo'lsa /revoke qilib yangisini oling)");
    console.log("4. Olingan tokenni .env fayliga TELEGRAM_BOT_TOKEN=... qilib qo'ying\n");
    process.exit(1);
  }

  try {
    const res = await fetch(`${TELEGRAM_API}/getMe`);
    const data = await res.json();

    if (!data.ok) {
      console.error(`❌ Telegram API xatosi (${data.error_code}): ${data.description}`);
      if (data.error_code === 401) {
        console.log("\n⚠️ Sabab: Ushbu bot token Telegram tomonidan bekor qilingan yoki noto'g'ri.");
        console.log("GitHub'ga token yuklanganda, Telegram uni avtomatik xavfsizlik yuzasidan o'chirib qo'yadi.");
        console.log("\n👉 Qanday to'g'rilash kerak:");
        console.log("1. Telegram'da @BotFather ga kiring");
        console.log("2. /mybots -> Botingizni tanlang -> API Token -> Yangi token oling");
        console.log("3. .env fayliga yangi tokenni yozing: TELEGRAM_BOT_TOKEN=...");
        console.log("4. Supabase Secrets'ga ham qo'ying: supabase secrets set TELEGRAM_BOT_TOKEN=...");
      }
      return null;
    }

    console.log("✅ Bot muvaffaqiyatli ulandi!");
    console.log(`🤖 Bot nomi: ${data.result.first_name} (@${data.result.username})`);
    console.log(`🆔 Bot ID: ${data.result.id}`);
    return data.result;
  } catch (e) {
    console.error("❌ Telegram API ga ulanishda tarmoq xatosi:", e.message);
    return null;
  }
}

async function getWebhookInfo() {
  const res = await fetch(`${TELEGRAM_API}/getWebhookInfo`);
  const data = await res.json();
  if (data.ok) {
    console.log("\n🌐 Joriy Webhook holati:");
    console.log(`   URL: ${data.result.url || "(yo'q / Long Polling rejimida)"}`);
    console.log(`   Kutilayotgan yangilanishlar: ${data.result.pending_update_count}`);
    if (data.result.last_error_message) {
      console.log(`   ⚠️ Oxirgi xatolik: ${data.result.last_error_message}`);
      console.log(`   Sana: ${new Date(data.result.last_error_date * 1000).toLocaleString()}`);
    }
  }
}

async function setWebhook() {
  console.log(`\n🔗 Webhook o'rnatilmoqda: ${WEBHOOK_URL}`);
  const res = await fetch(`${TELEGRAM_API}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: WEBHOOK_URL }),
  });
  const data = await res.json();
  if (data.ok) {
    console.log("✅ Webhook muvaffaqiyatli o'rnatildi! Endi foydalanuvchilar botga yozganda Supabase Edge Function javob beradi.");
  } else {
    console.error(`❌ Webhook o'rnatishda xatolik: ${data.description}`);
  }
}

async function deleteWebhook() {
  const res = await fetch(`${TELEGRAM_API}/deleteWebhook`);
  const data = await res.json();
  if (data.ok) {
    console.log("✅ Webhook o'chirildi (Long-polling rejimi yoqildi).");
  }
}

async function sendMessage(chatId, text, extra = {}) {
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
  return res.json();
}

async function runLongPolling() {
  const botInfo = await checkBot();
  if (!botInfo) process.exit(1);

  await deleteWebhook();

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log(`\n🚀 Long-polling bot ishga tushdi (@${botInfo.username}). Xabarlar kutilmoqda... (To'xtatish uchun Ctrl+C)\n`);

  let offset = 0;

  while (true) {
    try {
      const res = await fetch(`${TELEGRAM_API}/getUpdates?offset=${offset}&timeout=30`);
      const data = await res.json();

      if (!data.ok || !data.result) {
        await new Promise((r) => setTimeout(r, 2000));
        continue;
      }

      for (const update of data.result) {
        offset = update.update_id + 1;
        const msg = update.message;
        if (!msg) continue;

        const chatId = msg.chat.id;
        const text = (msg.text || "").trim();
        const firstName = msg.from?.first_name || "Foydalanuvchi";
        const isStart = text === "/start" || text.startsWith("/start ") || text.startsWith("/start@");

        // 1. /start buyrug'i
        if (isStart) {
          console.log(`📥 /start qabul qilindi: ${firstName} (ID: ${msg.from.id})`);
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
          continue;
        }

        // 2. Kontakt ulashilganda
        if (msg.contact) {
          const contact = msg.contact;
          const telegramId = String(msg.from.id);
          const rawPhone = contact.phone_number;
          const phone = rawPhone.startsWith("+") ? rawPhone : `+${rawPhone}`;
          const uFirstName = contact.first_name || msg.from?.first_name || "";
          const uLastName = contact.last_name || msg.from?.last_name || "";
          const uUsername = msg.from?.username || "";

          console.log(`📱 Kontakt qabul qilindi: ${phone} (${uFirstName}, tg: ${telegramId})`);

          // 4 xonali kod yaratish
          const code = String(Math.floor(1000 + Math.random() * 9000));
          const expiresAt = Date.now() + 5 * 60 * 1000; // 5 daqiqa

          // Eski kodlarni o'chirish
          await supabase.from("telegram_codes").delete().eq("telegram_id", telegramId);

          // Yangi kodni saqlash
          const { error: insertErr } = await supabase.from("telegram_codes").insert({
            telegram_id: telegramId,
            phone,
            code,
            first_name: uFirstName,
            last_name: uLastName,
            username: uUsername,
            photo_url: "",
            expires_at: expiresAt,
            used: false,
          });

          if (insertErr) {
            console.error("❌ DB ga kod yozishda xatolik:", insertErr);
            await sendMessage(chatId, "⚠️ Xatolik yuz berdi, qaytadan urinib ko'ring.");
            continue;
          }

          console.log(`🔑 Tasdiqlash kodi yaratildi: [ ${code} ] -> ${phone}`);

          // Kodni yuborish
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
          continue;
        }

        // 3. Boshqa xabarlar
        if (text && !isStart) {
          await sendMessage(chatId,
            `EduKids platformasiga kirish uchun pastdagi tugmani bosing yoki /start buyrug'ini yuboring.`,
            {
              reply_markup: {
                keyboard: [[{ text: "📱 Telefon raqamni ulashish", request_contact: true }]],
                resize_keyboard: true,
                one_time_keyboard: true,
              },
            }
          );
        }
      }
    } catch (err) {
      console.error("Polling xatosi:", err.message);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
}

// Asosiy boshqaruv
async function main() {
  if (args.includes("--set-webhook")) {
    const bot = await checkBot();
    if (bot) await setWebhook();
    return;
  }

  if (args.includes("--delete-webhook")) {
    const bot = await checkBot();
    if (bot) await deleteWebhook();
    return;
  }

  if (args.includes("--status")) {
    const bot = await checkBot();
    if (bot) await getWebhookInfo();
    return;
  }

  // Standart holatda long-polling
  await runLongPolling();
}

main();
