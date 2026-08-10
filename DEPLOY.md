# EduKids — Deploy qo'llanmasi

## Vercel Ma'lumotlari

| Parametr | Qiymat |
|----------|--------|
| **Akkaunt** | jaloldinovshoxrux2@gmail.com |
| **Team** | edu-kids (EduKids) |
| **Dashboard** | https://vercel.com/edu-kids |

### Loyihalar

| Loyiha | Vercel URL | Papka |
|--------|-----------|-------|
| **Admin panel** | https://edukids-admin.vercel.app | `admin-web/` |
| **Student app** | https://edukids-student.vercel.app | `student-app/` |

---

## Tez Deploy (CLI orqali)

### 1. Admin panelni deploy qilish

```bash
# 1-qadam: Build
npm run admin:build

# 2-qadam: Deploy
cd admin-web
npx vercel deploy --prod --yes
```

### 2. Student app'ni deploy qilish

```bash
# 1-qadam: Build
npm run student:build

# 2-qadam: Deploy
cd student-app
npx vercel deploy --prod --yes
```

### 3. Ikkalasini birdan deploy qilish

```bash
# Root papkadan:
npm run build
cd admin-web && npx vercel deploy --prod --yes && cd ..
cd student-app && npx vercel deploy --prod --yes && cd ..
```

---

## Android APK Build

```bash
cd student-app
npm run build
npx cap sync android
# Android Studio da: Build > Build Bundle(s) / APK(s) > Build APK(s)
```

---

## GitHub

| Parametr | Qiymat |
|----------|--------|
| **Repo** | https://github.com/jaloldinovshoxrux2-glitch/edukids.git |
| **Branch** | main |

### GitHub'ga push qilish

```bash
git add -A
git commit -m "tavsif"
git push origin main
```

---

## Muhim: Environment Variables

Vercel Dashboard'da har bir loyiha uchun qo'shilishi kerak:

| Key | Qayerdan olish |
|-----|----------------|
| `VITE_SUPABASE_URL` | Supabase Dashboard > Settings > API |
| `VITE_SUPABASE_ANON_KEY` | Supabase Dashboard > Settings > API |

---

## Domen ulash

1. Vercel Dashboard > Loyiha > Settings > Domains
2. Domenni kiriting (masalan: `admin.edukids.uz`)
3. DNS providerda Vercel ko'rsatgan CNAME yoki A record qo'shing:
   - CNAME: `cname.vercel-dns.com`
   - Yoki A: `76.76.21.21`

---

## Eslatma

- `vercel.json` fayllari har bir loyiha papkasida bor — ular `buildCommand: ""` va `outputDirectory: "dist"` deb sozlangan
- Ya'ni Vercel build qilmaydi, tayyor `dist` papkani deploy qiladi
- Shuning uchun deploy qilishdan OLDIN mahalliy `npm run build` qilish SHART
