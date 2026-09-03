# EduKids / TushunGo — Deploy va Production Qo'llanmasi

Ushbu hujjat loyihani **tushungo.uz** domeniga, Vercel va Supabase ga to'liq deploy qilish bo'yicha yo'riqnomadir.

---

## 1. Loyihaning Production Arxitekturasi

| Qism | Xizmat / Server | Domen / Manzil | Holati |
|------|-----------------|----------------|--------|
| **Student App (Web)** | Vercel | https://tushungo.uz (https://www.tushungo.uz) | Foydalanuvchilar o'qiydigan asosiy portal |
| **Admin Web** | Vercel | https://edukids-admin.vercel.app | O'qituvchi va admin boshqaruv paneli |
| **Backend & DB** | Supabase (PostgreSQL) | https://ybltddehavbczcwvyjrt.supabase.co | Ma'lumotlar bazasi, Auth, RLS, Storage |
| **Telegram Bot** | Supabase Edge Functions | https://ybltddehavbczcwvyjrt.supabase.co/functions/v1/telegram-bot | 24/7 serverless bot (kompyuterga bog'liq emas) |

---

## 2. Telegram Botni Production'da (24/7) Ishlatish

Bot foydalanuvchi kompyuteri o'chirilgan bo'lsa ham **Supabase Edge Functions** orqali 24/7 tun-u kun ishlaydi. Buning uchun 2 ta narsa sozlangan bo'lishi kerak:

### 2.1. Telegram Webhook (Bajarildi ✅)
Telegram serveri yangi xabarlarni to'g'ridan-to'g'ri Supabase ga yuborishi uchun webhook o'rnatildi:
```bash
# Webhook holatini tekshirish:
node shared/scripts/bot-runner.mjs --status

# Webhook'ni qayta o'rnatish (zarur bo'lsa):
node shared/scripts/bot-runner.mjs --set-webhook
```

### 2.2. Supabase Secrets'da Bot Tokenni yangilash
Supabase bulutidagi Edge Function'lar yangi tokenni bilishi uchun:
1. https://supabase.com/dashboard/project/ybltddehavbczcwvyjrt/settings/functions sahifasiga kiring.
2. **Secrets** bo'limida `TELEGRAM_BOT_TOKEN` qiymatini yangi tokenga yangilang:
   `8623503044:AAH6e9qXkC5EpZMDyo0fyM4d8XkM7wihxDw`
3. **Save** ni bosing.

### 2.3. Yangilangan Edge Function kodini joylash
`supabase/functions/telegram-bot/index.ts` faylidagi to'g'rilangan kodni Supabase ga joylash uchun:
- Supabase Dashboard > **Edge Functions** > `telegram-bot` bo'limiga kiring va yangi kodni qo'ying.
- Yoki Supabase CLI orqali:
  ```bash
  npx supabase functions deploy telegram-bot --no-verify-jwt
  ```

---

## 3. `tushungo.uz` (Student App) ga Deploy Qilish

`student-app` ga kiritilgan barcha o'zgarishlar va login tuzatishlari `tushungo.uz` da yangilanishi uchun:

### Usul A: Git orqali (Vercel avtomatik deploy — Eng qulay)
Agar Vercel loyihangiz GitHub reposiga ulangan bo'lsa:
```bash
git add -A
git commit -m "fix: telegram login and start button handler"
git push origin main
```
Vercel avtomatik tarzda yangi kodni oladi va bir necha soniyada `tushungo.uz` ga joylaydi.

### Usul B: Vercel CLI orqali qo'lda deploy qilish
```bash
# 1. Eng so'nggi buildni yaratish:
npm run student:build

# 2. Vercel ga login qilish (agar birinchi marta bo'lsa):
npx vercel login

# 3. tushungo.uz ga deploy qilish:
cd student-app
npx vercel deploy --prod --yes
cd ..
```

---

## 4. Admin Panelni Deploy Qilish

```bash
# 1. Admin build:
npm run admin:build

# 2. Deploy:
cd admin-web
npx vercel deploy --prod --yes
cd ..
```

---

## 5. Vercel Environment Variables (Muhim)

Vercel Dashboard (`edukids-student` loyihasi) > **Settings** > **Environment Variables** bo'limida quyidagilar bo'lishi shart:

| Parametr | Qiymat |
|----------|--------|
| `VITE_SUPABASE_URL` | `https://ybltddehavbczcwvyjrt.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1Ni...` (Anon key) |
| `VITE_TELEGRAM_BOT_USERNAME` | `edukids_login_bot` |

---

## 6. Android APK Build (Capacitor)

```bash
cd student-app
npm run build
npx cap sync android
# Android Studio'da:
# Build > Build Bundle(s) / APK(s) > Build APK(s)
```
APK fayl `student-app/android/app/build/outputs/apk/debug/app-debug.apk` yo'lida paydo bo'ladi.

