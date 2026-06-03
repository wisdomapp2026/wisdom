# ⚡ EduKids — O'quv Markazi Platformasi

O'quv markazi uchun to'liq platforma: **Admin (web desktop)** + **O'quvchi (web responsive mobile/tablet/desktop)**.

## 🚀 Tezkor boshlash

```bash
# 1. Install
npm install --legacy-peer-deps

# 2. Firebase demo data yuklash (bir marta)
npm run seed

# 3. Admin panel (http://localhost:5173)
npm run admin:dev

# 4. O'quvchi app (http://localhost:3000)
npm run student:web
```

## 📁 Loyiha tuzilmasi

```
edukids/
├── shared/                  # Umumiy kod
│   ├── src/
│   │   ├── firebase.ts          # Firebase konfiguratsiya
│   │   ├── types.ts             # 15+ TypeScript model
│   │   └── repositories/       # Firestore CRUD
│   └── scripts/
│       └── seed-demo.mjs        # Demo kurs yaratish
├── admin-web/               # Admin Panel (React + Vite + Tailwind)
│   └── src/
│       ├── layouts/AdminLayout  # Sidebar + topbar
│       ├── pages/               # 10 sahifa
│       └── components/          # Modallar (Create Course/Topic/Problem)
├── student-app/             # O'quvchi App (React + Vite + Tailwind)
│   └── src/
│       ├── components/BottomNav # Pastki navigatsiya
│       └── pages/               # 13 sahifa
└── .env                     # Firebase kalitlari
```

## 🎨 Texnologiyalar

| Qism | Texnologiya |
|------|-------------|
| Admin Web | React 19, Vite, TypeScript, TailwindCSS, Recharts, Lucide |
| Student App | React 19, Vite, TypeScript, TailwindCSS, Lucide (mobile responsive) |
| Backend | Firebase (Firestore, Auth, Storage) |
| Matematika | KaTeX (LaTeX render) — keyingi sessiyada |

## 📱 Student App ekranlar

| # | Sahifa | URL | Firebase |
|---|--------|-----|----------|
| 1 | Bosh sahifa | `/` | — |
| 2 | Kurslar | `/courses` | ✅ Firestore |
| 3 | Testlar | `/tests` | — |
| 4 | Profil | `/profile` | — |
| 5 | Kurs detail | `/course/:id` | ✅ Firestore |
| 6 | Topic detail | `/course/:id/topic/:id` | ✅ Firestore |
| 7 | Login | `/login` | — |
| 8 | Register | `/register` | — |
| 9 | Test ishlash | `/test/:id` | — |
| 10 | Test natijalar | `/test-result` | — |
| 11 | Subscription | `/subscription` | — |
| 12 | Payment | `/payment` | — |
| 13 | Premium gate | `/premium-gate` | — |

## �️ Admin Panel sahifalar

| # | Sahifa | Firebase |
|---|--------|----------|
| 1 | Dashboard (statistikalar, grafiklar) | Demo data |
| 2 | Kurslar ro'yxati | ✅ CRUD |
| 3 | Kurs detail (mavzular) | ✅ Real data |
| 4 | Topic detail (misollar) | ✅ Real data |
| 5 | Test Builder | Demo |
| 6 | Test Preview | Demo |
| 7 | Login/Auth | ✅ Firebase Auth |
| 8 | Students, Analytics, Settings | Placeholder |

## 🔥 Firebase ma'lumotlar

Demo kurs "Boshlang'ich Matematika":
- 10 ta mavzu (5 bepul + 5 premium)
- 29 ta misol (LaTeX formulalar + video yechimlar)
- 1 ta test (7 savol)
- Admin user

## 🗓️ Keyingi sessiyalar

- [ ] Admin — CRUD formalar to'liq ishlashi (kurs/mavzu/misol taxrirlash, o'chirish)
- [ ] Admin — LaTeX editor + rasm upload
- [ ] Student — Firebase Auth (telefon + parol)
- [ ] Student — Test ishlash Firebase bilan
- [ ] Student — Profil real data
- [ ] Student — Obuna/to'lov integratsiya
- [ ] Android — Capacitor yoki PWA
