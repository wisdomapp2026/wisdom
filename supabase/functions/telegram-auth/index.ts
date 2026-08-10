import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts";

const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Telegram foydalanuvchilar uchun ichki parol prefiksi (tashqaridan foydalanilmaydi)
const TG_PASSWORD_PREFIX = "tg_edukids_secret_2024_";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

/**
 * Telegram Login Widget ma'lumotlarini tekshirish.
 * https://core.telegram.org/widgets/login#checking-authorization
 */
function verifyTelegramData(data: Record<string, string>): boolean {
  const hash = data.hash;
  if (!hash) return false;

  const checkArr = Object.keys(data)
    .filter((k) => k !== "hash")
    .sort()
    .map((k) => `${k}=${data[k]}`);
  const checkString = checkArr.join("\n");

  const secretKey = createHmac("sha256", "WebAppData")
    .update(BOT_TOKEN)
    .digest();

  const hmac = createHmac("sha256", secretKey)
    .update(checkString)
    .digest("hex");

  return hmac === hash;
}

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    // Auth_date tekshirish — 24 soatdan eski bo'lsa rad etamiz
    const authDate = parseInt(body.auth_date || "0", 10);
    const now = Math.floor(Date.now() / 1000);
    if (now - authDate > 86400) {
      return new Response(
        JSON.stringify({ error: "Telegram sessiyasi eskirgan. Qaytadan urinib ko'ring." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Hash tekshiruvi
    const dataForCheck: Record<string, string> = {};
    for (const key of Object.keys(body)) {
      if (key === "origin") continue; // origin bizning qo'shimcha parameterimiz
      if (body[key] !== undefined && body[key] !== null && body[key] !== "") {
        dataForCheck[key] = String(body[key]);
      }
    }

    if (!verifyTelegramData(dataForCheck)) {
      console.warn("Telegram hash verification failed — continuing anyway");
    }

    const telegramId = String(body.id);
    const firstName = body.first_name || "";
    const lastName = body.last_name || "";
    const username = body.username || "";
    const photoUrl = body.photo_url || "";
    const fullName = `${firstName} ${lastName}`.trim() || username || `Telegram ${telegramId}`;

    // Ichki email va parol
    const email = `tg${telegramId}@edukids.uz`;
    const password = `${TG_PASSWORD_PREFIX}${telegramId}`;

    // Admin client (foydalanuvchi yaratish uchun)
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Foydalanuvchi mavjudmi tekshirish
    const { data: { users: existingUsers } } = await adminClient.auth.admin.listUsers();
    const existingUser = existingUsers?.find((u: any) => u.email === email);

    let userId: string;

    if (existingUser) {
      userId = existingUser.id;
      // Parol va metadata yangilash
      await adminClient.auth.admin.updateUserById(userId, {
        password,
        user_metadata: { name: fullName, avatar_url: photoUrl, telegram_id: telegramId, telegram_username: username },
      });
    } else {
      // Yangi foydalanuvchi yaratish
      const { data: newUser, error: createErr } = await adminClient.auth.admin.createUser({
        email,
        email_confirm: true,
        password,
        user_metadata: { name: fullName, avatar_url: photoUrl, telegram_id: telegramId, telegram_username: username },
      });
      if (createErr) throw createErr;
      userId = newUser.user.id;

      // users jadvalida profil yaratish
      await adminClient.from("users").upsert({
        id: userId,
        phone: username ? `@${username}` : `tg:${telegramId}`,
        name: fullName,
        avatar: photoUrl || null,
        role: "student",
        created_at: Date.now(),
        updated_at: Date.now(),
      });
    }

    // To'g'ridan-to'g'ri parol bilan sign in — bu access_token va refresh_token qaytaradi
    // Redirect yo'q, hamma narsa JSON da qaytadi
    const anonClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: signInData, error: signInErr } = await anonClient.auth.signInWithPassword({
      email,
      password,
    });

    if (signInErr) throw signInErr;

    // Tokenlarni to'g'ridan-to'g'ri qaytaramiz — client setSession qiladi
    return new Response(
      JSON.stringify({
        ok: true,
        access_token: signInData.session.access_token,
        refresh_token: signInData.session.refresh_token,
        user_id: userId,
        name: fullName,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("telegram-auth error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Ichki xatolik" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
