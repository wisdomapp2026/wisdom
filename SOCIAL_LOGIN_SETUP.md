# Google, Apple va Telegram orqali kirish — sozlash bo'yicha ko'rsatmalar

Bu qo'llanma Supabase Auth bilan Google, Apple va Telegram login ni ketma-ket sozlash tartibini tushuntiradi.

---

## 1. GOOGLE ORQALI KIRISH

### 1.1. Google Cloud Console da OAuth yaratish

1. https://console.cloud.google.com ga o'ting
2. Loyihangizni tanlang (yoki yangi yarating)
3. Chap menuda **APIs & Services → Credentials** ni bosing
4. **+ CREATE CREDENTIALS → OAuth client ID** ni tanlang
5. Agar birinchi marta bo'lsa — **Configure consent screen** bosing:
   - User Type: **External**
   - App name: `EduKids`
   - User support email: o'zingizning email
   - Developer contact: o'zingizning email
   - **Save and Continue** (Scopes va Test users ni o'tkazib yuboring)
   - **Publish App** (test rejimidan chiqish uchun)
6. Credentials sahifasiga qaytib, **+ CREATE CREDENTIALS → OAuth client ID**:
   - Application type: **Web application**
   - Name: `EduKids Supabase`
   - Authorized redirect URIs — quyidagini qo'shing:
     ```
     https://ybltddehavbczcwvyjrt.supabase.co/auth/v1/callback
     ```
   - **Create** bosing
7. Ochilgan oynadan **Client ID** va **Client Secret** ni nusxalang

### 1.2. Supabase da Google Provider ni yoqish

1. https://supabase.com/dashboard ga kiring
2. Loyihangizni oching → chap menuda **Authentication → Providers**
3. **Google** qatorini toping va yoqing (Enable)
4. Maydonlarni to'ldiring:
   - **Client ID:** Google dan olgan Client ID
   - **Client Secret:** Google dan olgan Secret
   - **Redirect URL** ni nusxalang (bu yuqoridagi `https://...supabase.co/auth/v1/callback`)
5. **Save** bosing

### 1.3. Supabase Dashboard da Redirect URL sozlash

1. **Authentication → URL Configuration** bo'limiga o'ting
2. **Redirect URLs** ga quyidagilarni qo'shing:
   ```https://ybltddehavbczcwvyjrt.supabase.co/auth/v1/callback
   http://localhost:5173/**
   http://localhost:3001/**
   https://sizning-domen.netlify.app/**
   ```
   (Bu login bo'lgandan keyin foydalanuvchi qayerga qaytishini belgilaydi)

---

## 2. APPLE ORQALI KIRISH

### 2.1. Apple Developer da sozlash

Apple Sign In uchun **Apple Developer Program** a'zoligi kerak ($99/yil).

1. https://developer.apple.com/account ga kiring
2. **Certificates, Identifiers & Profiles** bo'limiga o'ting

#### 2.1.1. App ID yaratish
3. **Identifiers** → **+** bosing
4. **App IDs** tanlang → **Continue**
5. Platform: **iOS** (yoki web uchun ham ishlaydi)
6. Description: `EduKids`
7. Bundle ID: `uz.edukids.app` (yoki o'zingizning)
8. Capabilities bo'limida **Sign In with Apple** ni belgilang
9. **Register**

#### 2.1.2. Service ID yaratish (web uchun)
10. **Identifiers** → **+** → **Services IDs** tanlang
11. Description: `EduKids Web`
12. Identifier: `uz.edukids.web` (yoki o'zingizning)
13. **Register** → keyin shu service ni oching
14. **Sign In with Apple** ni belgilang → **Configure**:
    - Primary App ID: yuqorida yaratgan App ID ni tanlang
    - Domains: `ybltddehavbczcwvyjrt.supabase.co`
    - Return URLs:
      ```
      https://ybltddehavbczcwvyjrt.supabase.co/auth/v1/callback
      ```
15. **Save** → **Continue** → **Register**

#### 2.1.3. Private Key yaratish
16. **Keys** → **+** bosing
17. Key Name: `EduKids Supabase`
18. **Sign In with Apple** ni belgilang → **Configure** → Primary App ID ni tanlang
19. **Register** → **Download** bosing (`.p8` fayl yuklanadi — BIR MARTADAN KEYIN YUKLAB BO'LMAYDI!)
20. **Key ID** ni yozib oling

### 2.2. Supabase da Apple Provider ni yoqish

1. Supabase Dashboard → **Authentication → Providers → Apple**
2. Yoqing va maydonlarni to'ldiring:
   - **Client ID (Service ID):** `uz.edukids.web` (yuqorida yaratgan Service ID)
   - **Secret Key:** `.p8` faylining tarkibini to'liq qo'ying (-----BEGIN PRIVATE KEY----- dan boshlab)
   - **Key ID:** Apple dan olgan Key ID
   - **Team ID:** Apple Developer akkauntingizning Team ID si
     (developer.apple.com → Account → Membership → Team ID)
3. **Save**

---

## 3. TELEGRAM ORQALI KIRISH

Supabase Telegram ni standart provider sifatida qo'llab-quvvatlamaydi. Shuning uchun **Telegram Login Widget** + Supabase **Custom Token** (yoki edge function) strategiyasi ishlatiladi.

### 3.1. Telegram Bot yaratish

1. Telegram da [@BotFather](https://t.me/BotFather) ni oching
2. `/newbot` buyrug'ini yuboring
3. Bot nomini kiriting: `EduKids Login Bot`
4. Username kiriting: `edukids_login_bot` (yoki boshqa bo'sh nom)
5. **Bot Token** ni nusxalang (8623503044:AAG2zb2OW3G4rhUgAj6oMr3Fx7k88zWobhc)
6. `/setdomain` buyrug'ini yuboring:
   - Bot ni tanlang
   - Domen kiriting: `ybltddehavbczcwvyjrt.supabase.co`
   (yoki deploy qilingan domeningiz)

### 3.2. Supabase Edge Function yaratish

Telegram widget foydalanuvchi ma'lumotlarini imzolangan hash bilan qaytaradi. Buni tekshirish va Supabase sessiyasi yaratish uchun edge function kerak.

#### Supabase CLI o'rnatish (agar yo'q bo'lsa):
```bash
npm install -g supabase
supabase login
supabase link --project-ref ybltddehavbczcwvyjrt
```

#### Edge function yaratish:
```bash
supabase functions new telegram-auth
```

`supabase/functions/telegram-auth/index.ts` fayliga:

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "https://deno.land/std@0.168.0/crypto/mod.ts";

const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Telegram ma'lumotlarini tekshirish (hash validatsiyasi)
function verifyTelegramData(data: Record<string, string>): boolean {
  const hash = data.hash;
  const checkArr = Object.keys(data)
    .filter((k) => k !== "hash")
    .sort()
    .map((k) => `${k}=${data[k]}`);
  const checkString = checkArr.join("\n");

  const secretKey = createHmac("sha256", "WebAppData")
    .update(new TextEncoder().encode(BOT_TOKEN))
    .digest();
  const hmac = createHmac("sha256", secretKey)
    .update(new TextEncoder().encode(checkString))
    .digest("hex");

  return hmac === hash;
}

serve(async (req) => {
  // CORS
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  try {
    const body = await req.json();

    // 1. Telegram hash ni tekshirish
    if (!verifyTelegramData(body)) {
      return new Response(JSON.stringify({ error: "Noto'g'ri Telegram ma'lumotlari" }), {
        status: 401,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    const telegramId = body.id;
    const firstName = body.first_name || "";
    const lastName = body.last_name || "";
    const username = body.username || "";
    const photoUrl = body.photo_url || "";
    const fullName = `${firstName} ${lastName}`.trim() || username || `Telegram ${telegramId}`;

    // 2. Email sifatida telegram ID ishlatamiz
    const email = `tg${telegramId}@edukids.uz`;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // 3. Foydalanuvchi mavjudmi tekshirish
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find((u) => u.email === email);

    let userId: string;

    if (existingUser) {
      userId = existingUser.id;
    } else {
      // Yangi foydalanuvchi yaratish
      const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
        email,
        email_confirm: true,
        password: `tg_${telegramId}_${Date.now()}`, // tasodifiy parol (ishlatilmaydi)
        user_metadata: { name: fullName, avatar_url: photoUrl, telegram_id: telegramId },
      });
      if (createErr) throw createErr;
      userId = newUser.user.id;

      // Profil yaratish
      await supabase.from("users").upsert({
        id: userId,
        phone: username ? `@${username}` : `tg:${telegramId}`,
        name: fullName,
        avatar: photoUrl || null,
        role: "student",
        created_at: Date.now(),
        updated_at: Date.now(),
      });
    }

    // 4. Sessiya yaratish (magic link token orqali)
    const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email,
    });
    if (linkErr) throw linkErr;

    // Token ni URL dan ajratib olish
    const url = new URL(linkData.properties.action_link);
    const token = url.searchParams.get("token") || url.hash?.split("access_token=")[1];

    return new Response(
      JSON.stringify({
        ok: true,
        // Client bu URL ga redirect qiladi — Supabase sessiya yaratadi
        redirect_url: linkData.properties.action_link,
        user_id: userId,
        name: fullName,
      }),
      {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
});
```

#### Deploy:
```bash
supabase secrets set TELEGRAM_BOT_TOKEN=7123456789:AAF...sizning_token
supabase functions deploy telegram-auth --no-verify-jwt
```

### 3.3. Client (ilova) tomonda Telegram Login Widget

Student app login sahifasiga Telegram tugmasini qo'shish uchun quyidagi mantiq ishlatiladi:

```typescript
// Telegram Login Widget script
function openTelegramLogin() {
  const botName = "edukids_login_bot"; // BotFather dan olgan username
  const redirectUrl = `${window.location.origin}/auth/telegram-callback`;

  // Telegram OAuth URL
  window.location.href = `https://oauth.telegram.org/auth?bot_id=${botName}&origin=${window.location.origin}&request_access=write&return_to=${redirectUrl}`;
}
```

Yoki oddiyroq usul — sahifaga Telegram widget qo'shish:

```html
<script async src="https://telegram.org/js/telegram-widget.js?22"
  data-telegram-login="edukids_login_bot"
  data-size="large"
  data-radius="12"
  data-onauth="onTelegramAuth(user)"
  data-request-access="write">
</script>

<script>
function onTelegramAuth(user) {
  // user = { id, first_name, last_name, username, photo_url, auth_date, hash }
  fetch('https://ybltddehavbczcwvyjrt.supabase.co/functions/v1/telegram-auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(user),
  })
  .then(res => res.json())
  .then(data => {
    if (data.redirect_url) {
      window.location.href = data.redirect_url;
    }
  });
}
</script>
```

---

## 4. XULOSA: KETMA-KETLIK

| # | Qadam | Vaqt |
|---|---|---|
| 1 | Google Cloud Console da OAuth yaratish | 5 daqiqa |
| 2 | Supabase da Google ni yoqish | 2 daqiqa |
| 3 | Apple Developer da App/Service/Key yaratish | 15 daqiqa |
| 4 | Supabase da Apple ni yoqish | 3 daqiqa |
| 5 | Telegram Bot yaratish (BotFather) | 3 daqiqa |
| 6 | Supabase Edge Function deploy | 10 daqiqa |
| 7 | Client kodga tugmalar qo'shish | Men qilaman |
| 8 | Redirect URL larni sozlash | 2 daqiqa |
| 9 | Test qilish | 5 daqiqa |

---

## 5. SIZNIG QADAM

Yuqoridagi 1-6 qadamlarni bajaring va menga quyidagi ma'lumotlarni bering:

**Google uchun:**
- Client ID
- Client Secret

**Apple uchun:**
- Service ID (masalan `uz.edukids.web`)
- Key ID
- Team ID
- `.p8` faylning mazmuni

**Telegram uchun:**
- Bot Token (BotFather dan)
- Bot Username (masalan `edukids_login_bot`)

Shu ma'lumotlar bo'lgach, men:
1. Supabase sozlamalarini tekshiraman
2. Login/Register sahifalariga Google, Apple, Telegram tugmalarini qo'shaman
3. Callback sahifasini yarataman
4. Sinovdan o'tkazaman

---

## 6. MUHIM ESLATMALAR

- **Google:** darhol ishlaydi, hech qanday tasdiqlash kutmasangiz bo'ladi
- **Apple:** faqat HTTPS da ishlaydi (localhost da ishlamaydi — deploy qilingan domendan sinash kerak). Safari da yaxshi ishlaydi.
- **Telegram:** widget faqat HTTPS domendan ishlaydi. `localhost` da sinash uchun ngrok yoki deploy kerak.
- **Parollar:** ijtimoiy tarmoq orqali kirgan foydalanuvchilarga parol kerak emas — sessiya token orqali boshqariladi.
- **Mavjud foydalanuvchilar:** agar biror foydalanuvchi avval telefon bilan ro'yxatdan o'tgan bo'lsa va keyin Google bilan kirsa — Supabase ikki alohida hisob yaratadi. Buni "Account Linking" orqali hal qilish mumkin (keyingi qadam).
