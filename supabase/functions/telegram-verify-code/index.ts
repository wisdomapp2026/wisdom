import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Telegram foydalanuvchilar uchun ichki parol
const TG_PASSWORD_PREFIX = "tg_edukids_secret_2024_";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info, X-Client-Info",
};

/**
 * Telegram tasdiqlash kodini tekshirish va sessiya yaratish.
 * 
 * MUHIM: Foydalanuvchi TELEFON RAQAM bo'yicha identifikatsiya qilinadi.
 * Agar user avval telefon/google bilan ro'yxatdan o'tgan bo'lsa va keyin
 * Telegram orqali kirsa — shu mavjud profil ishlatiladi.
 * Agar user Telegram akkauntini o'chirib qayta ochsa — telefon raqam
 * bir xil bo'lgani uchun eski profili tiklanadi.
 * 
 * Client yuboradi: { code: "1234", phone: "+998901234567" }
 * Qaytaradi: { access_token, refresh_token, user_id, name }
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    const requestedHeaders = req.headers.get("access-control-request-headers");
    return new Response("ok", {
      headers: {
        ...corsHeaders,
        ...(requestedHeaders ? { "Access-Control-Allow-Headers": requestedHeaders } : {}),
      },
    });
  }

  try {
    const { code, phone } = await req.json();

    if (!code || !phone) {
      return new Response(
        JSON.stringify({ error: "Kod va telefon raqam majburiy" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Telefon raqamni normallashtirish
    const normalizedPhone = phone.replace(/\D/g, "");
    const phoneWithPlus = `+${normalizedPhone}`;
    const phoneVariants = [phone, phoneWithPlus, normalizedPhone];

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // 1. Kodni topish (telefon raqam bo'yicha)
    const { data: codeRecords, error: fetchErr } = await supabase
      .from("telegram_codes")
      .select("*")
      .eq("code", code)
      .eq("used", false)
      .order("created_at", { ascending: false })
      .limit(10);

    if (fetchErr) throw fetchErr;

    // Telefon raqam mos kelganini topish
    const codeRecord = codeRecords?.find((r: any) => {
      const rPhone = r.phone.replace(/\D/g, "");
      return phoneVariants.some(v => v.replace(/\D/g, "") === rPhone);
    });

    if (!codeRecord) {
      return new Response(
        JSON.stringify({ error: "Kod noto'g'ri yoki telefon raqam mos kelmadi." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Muddati tekshirish
    if (Date.now() > codeRecord.expires_at) {
      await supabase.from("telegram_codes").delete().eq("id", codeRecord.id);
      return new Response(
        JSON.stringify({ error: "Kod muddati tugagan. Botdan yangi kod oling." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Kodni ishlatilgan deb belgilash
    await supabase
      .from("telegram_codes")
      .update({ used: true })
      .eq("id", codeRecord.id);

    const telegramId = codeRecord.telegram_id;
    const storedPhone = codeRecord.phone;
    const firstName = codeRecord.first_name || "";
    const lastName = codeRecord.last_name || "";
    const username = codeRecord.username || "";
    const photoUrl = codeRecord.photo_url || "";
    const fullName = `${firstName} ${lastName}`.trim() || username || `Telegram ${telegramId}`;

    // ============================================================
    // 4. ASOSIY MANTIQ: Telefon raqam bo'yicha mavjud profilni izlash
    // ============================================================
    
    // 4a. users jadvalidan telefon raqam bo'yicha izlash
    // (avval telefon bilan yoki boshqa Telegram ID bilan ro'yxatdan o'tgan bo'lishi mumkin)
    const phoneDigits = storedPhone.replace(/\D/g, "");
    const { data: existingProfiles } = await supabase
      .from("users")
      .select("id, phone, name")
      .or(`phone.eq.${storedPhone},phone.eq.+${phoneDigits},phone.eq.${phoneDigits}`);

    let userId: string;
    let authEmail: string;

    if (existingProfiles && existingProfiles.length > 0) {
      // ✅ Mavjud profil topildi — shu profilga ulanamiz
      const existingProfile = existingProfiles[0];
      userId = existingProfile.id;

      // Bu foydalanuvchining auth hisobini topish
      const { data: { users: allAuthUsers } } = await supabase.auth.admin.listUsers();
      const authUser = allAuthUsers?.find((u: any) => u.id === userId);

      if (authUser) {
        // Mavjud auth hisob — parolni yangilab login qilamiz
        authEmail = authUser.email!;
        const password = `${TG_PASSWORD_PREFIX}${telegramId}`;
        await supabase.auth.admin.updateUserById(userId, {
          password,
          user_metadata: { 
            ...authUser.user_metadata,
            telegram_id: telegramId, 
            telegram_username: username,
          },
        });

        // Profildagi telefon va telegram ma'lumotlarini yangilash
        // ESLATMA: avatar yangilanmaydi — faqat birinchi ro'yxatda saqlanadi
        await supabase
          .from("users")
          .update({ 
            phone: storedPhone, 
            updated_at: Date.now(),
          })
          .eq("id", userId);

        // Login
        const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
          email: authEmail,
          password,
        });
        if (signInErr) throw signInErr;

        return new Response(
          JSON.stringify({
            ok: true,
            access_token: signInData.session.access_token,
            refresh_token: signInData.session.refresh_token,
            user_id: userId,
            name: existingProfile.name || fullName,
            phone: storedPhone,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      // Auth hisob topilmadi — yangi auth yaratamiz (lekin profil saqlanadi)
    }

    // 4b. Telegram ID bo'yicha ham tekshirish (email format: tg{id}@edukids.uz)
    const tgEmail = `tg${telegramId}@edukids.uz`;
    const password = `${TG_PASSWORD_PREFIX}${telegramId}`;

    const { data: { users: allUsers } } = await supabase.auth.admin.listUsers();
    const existingAuthByTg = allUsers?.find((u: any) => u.email === tgEmail);

    if (existingAuthByTg) {
      // Telegram ID bo'yicha auth topildi
      userId = existingAuthByTg.id;
      await supabase.auth.admin.updateUserById(userId, {
        password,
        user_metadata: { name: fullName, telegram_id: telegramId, telegram_username: username },
      });
      // Telefon raqamni yangilash (avatar o'zgarmaydi)
      await supabase
        .from("users")
        .update({ phone: storedPhone, name: fullName, updated_at: Date.now() })
        .eq("id", userId);

      const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
        email: tgEmail,
        password,
      });
      if (signInErr) throw signInErr;

      return new Response(
        JSON.stringify({
          ok: true,
          access_token: signInData.session.access_token,
          refresh_token: signInData.session.refresh_token,
          user_id: userId,
          name: fullName,
          phone: storedPhone,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4c. Telefon raqam bo'yicha auth izlash (telefon bilan ro'yxatdan o'tgan user)
    // Login format: {digits}@edukids.uz
    const phoneEmail = `${phoneDigits}@edukids.uz`;
    const existingAuthByPhone = allUsers?.find((u: any) => u.email === phoneEmail);

    if (existingAuthByPhone) {
      // Telefon bilan avval ro'yxatdan o'tgan — shu hisobga Telegram orqali kiramiz
      userId = existingAuthByPhone.id;
      const phonePassword = `${TG_PASSWORD_PREFIX}${telegramId}`;
      await supabase.auth.admin.updateUserById(userId, {
        password: phonePassword,
        user_metadata: { 
          ...existingAuthByPhone.user_metadata,
          telegram_id: telegramId, 
          telegram_username: username,
          avatar_url: photoUrl,
        },
      });
      // Telefon raqamni va avatarni yangilash
      // ESLATMA: avatar yangilanmaydi — faqat birinchi ro'yxatda saqlanadi
      await supabase
        .from("users")
        .update({ phone: storedPhone, updated_at: Date.now() })
        .eq("id", userId);

      const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
        email: phoneEmail,
        password: phonePassword,
      });
      if (signInErr) throw signInErr;

      return new Response(
        JSON.stringify({
          ok: true,
          access_token: signInData.session.access_token,
          refresh_token: signInData.session.refresh_token,
          user_id: userId,
          name: existingAuthByPhone.user_metadata?.name || fullName,
          phone: storedPhone,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 5. Hech qanday mavjud profil topilmadi — yangi foydalanuvchi yaratish
    const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
      email: tgEmail,
      email_confirm: true,
      password,
      user_metadata: { name: fullName, telegram_id: telegramId, telegram_username: username },
    });
    if (createErr) throw createErr;
    userId = newUser.user.id;

    // Telegram avatarni Supabase Storage ga doimiy saqlash
    let permanentAvatarUrl: string | null = null;
    if (photoUrl) {
      try {
        const imgRes = await fetch(photoUrl);
        if (imgRes.ok) {
          const imgBlob = await imgRes.blob();
          const filePath = `avatars/${userId}.jpg`;
          await supabase.storage.from("public").upload(filePath, imgBlob, {
            contentType: "image/jpeg",
            upsert: true,
          });
          const { data: urlData } = supabase.storage.from("public").getPublicUrl(filePath);
          permanentAvatarUrl = urlData.publicUrl;
        }
      } catch (e) {
        console.warn("Avatar saqlashda xatolik:", e);
        // Xato bo'lsa Telegram URL ni ishlatamiz (vaqtinchalik)
        permanentAvatarUrl = photoUrl;
      }
    }

    // users jadvalida profil yaratish
    await supabase.from("users").upsert({
      id: userId,
      phone: storedPhone,
      name: fullName,
      avatar: permanentAvatarUrl,
      role: "student",
      created_at: Date.now(),
      updated_at: Date.now(),
    });

    // 6. Sessiya yaratish
    const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
      email: tgEmail,
      password,
    });
    if (signInErr) throw signInErr;

    return new Response(
      JSON.stringify({
        ok: true,
        access_token: signInData.session.access_token,
        refresh_token: signInData.session.refresh_token,
        user_id: userId,
        name: fullName,
        phone: storedPhone,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("telegram-verify-code error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Ichki xatolik" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
