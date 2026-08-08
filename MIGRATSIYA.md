# Firebase → Supabase migratsiyasi: holat va qolgan qadamlar

## Nima buzilgan edi va nima uchun

### 1. Login ishlamagan (asosiy muammo)

`shared/src/supabase.ts` dagi `stringToUUID()` funksiyasi RFC4122 ning **qat'iy**
regexini ishlatgan (versiya nibble `[1-5]`, variant nibble `[89ab]`):

```
/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
```

Migratsiya esa Firebase UID larini **md5 hash** dan UUID yasagan. md5 natijasi
tasodifiy hex bo'lgani uchun 12 foydalanuvchidan **9 tasi** bu regexdan o'tmaydi.

Oqibat: foydalanuvchi login qiladi → `getUserById(user.uid)` chaqiriladi →
`stringToUUID()` allaqachon UUID bo'lgan ID ni **qaytadan hash qiladi** →
mavjud bo'lmagan ID hosil bo'ladi → profil topilmaydi → `App.tsx` ni
`supabase.auth.signOut()` chaqiradi → foydalanuvchi darhol tizimdan chiqib ketadi.

**Tuzatildi:** regex bo'shashtirildi (`8-4-4-4-12` hex shakli tekshiriladi,
versiya/variant nibble tekshirilmaydi).

### 2. 112 hujjat butunlay ko'chirilmagan

`migrate.mjs` quyidagi Firestore kolleksiyalarini umuman ko'chirmagan, holbuki
ilova kodi ularni `settings` jadvalidan o'qiydi:

| Firestore kolleksiya | Hujjat | Qayerda ishlatiladi |
|---|---|---|
| `testLibrary` | 56 | Admin → Testlar, ImportTestModal |
| `testBuilderQuestions` | 44 | Admin → Test Builder |
| `testBuilderFolders` | 8 | Admin → Test Builder |
| `studentNotifications` | 4 | O'quvchi → Bildirishnomalar |

**Tuzatildi:** `migrate-finish.mjs` ularni `settings` jadvaliga ko'chiradi.

### 3. FK cheklovlari tufayli tushib qolgan yozuvlar

`user_devices` (4), `user_activity` (1), `user_progress`, `favorites`,
`test_results` — foreign key xatolari tufayli o'tmagan.

**Tuzatildi.** Eslatma: o'chirilgan testga ishora qiluvchi natijalar
`test_id = NULL` bilan saqlanadi — ball va sana tarixi yo'qolmaydi.

### 4. Yetim (orphan) yozuvlar — ko'chirilmadi, bu to'g'ri

Bular Firebase da ham buzuq edi: o'chirilgan kurslarga (`5-sinf-algebra`,
`demo-boshlangich-matematika`) va o'chirilgan mavzuga (`topic-02`) ishora qiladi.
Postgres ularni qabul qilmaydi, chunki bog'langan kurs/mavzu mavjud emas.

Jami: 2 progress, 5 test natijasi, 1 sevimli.

### 5. Dublikat ma'lumotlar

`seed-supabase.mjs` va `create-test-users.mjs` skriptlari Firebase da mavjud
bo'lmagan ma'lumot qo'shgan: ijtimoiy tarmoq havolalari 2 marta, 4 ta ortiqcha
kategoriya, 3 ta ortiqcha motivatsion fraza, 3 ta soxta admin profili.

**Tuzatildi:** dublikatlar tozalandi, chalkashlik keltirgan skriptlar o'chirildi.

### 6. Ishlamay qolgan funksiyalar

| Funksiya | Sabab | Holat |
|---|---|---|
| Onlayn foydalanuvchilar soni | Presence funksiyalari bo'sh stub edi (doim 0) | Supabase Realtime Presence orqali tiklandi |
| 3 qurilma limiti | `useDeviceSession` kodi izohga olingan edi | Tiklandi |
| Admin rol tekshiruvi | `setIsAdmin(!!u)` — har qanday o'quvchi admin panelga kirardi | `users.role === "admin"` tekshiruvi qo'shildi |
| Ro'yxatdan o'tish | Ism kiritish maydoni yo'q, telefon formati login bilan mos kelmasdi | Tuzatildi |

---

## Ma'lumotlar holati (hozir)

| Jadval | Firebase | Supabase |
|---|---|---|
| users | 6 | 12 (+6 soxta, o'chirilmadi — bog'liq ma'lumot bor) |
| courses | 3 | 3 |
| topics | 57 | 57 |
| problems | 44 | 44 |
| tests | 6 | 6 |
| folders | 7 | 7 |
| advices | 1 | 1 |
| subscriptions | 6 | 6 |
| payments | 5 | 5 |
| messages | 4 | 4 |
| certificates | 2 | 2 |
| user_activity | 29 | 29 |
| user_devices | 4 | 4 |
| user_progress | 11 | 9 (2 tasi yetim) |
| test_results | 22 | 17 (5 tasi yetim) |
| favorites | 2 | 1 (1 tasi yetim) |
| testLibrary | 56 | 56 |
| testBuilderQuestions | 44 | 44 |
| testBuilderFolders | 8 | 8 |
| studentNotifications | 4 | 4 |

**Storage:** 52/52 fayl ko'chgan, barcha URL lar ishlaydi (HTTP 200/206 bilan
tasdiqlangan). DB da Firebase URL qoldig'i yo'q.

---

## Parollar

Firebase parol hashlari `scrypt` formatida (`users.json` dagi `passwordHash` +
`salt`). Supabase bu formatni qabul qilmaydi, shuning uchun migratsiya vaqtida
parollar qayta belgilangan:

- **Admin:** `admin123` (email: `admin@edukids.uz`)
- **O'quvchi:** `123456` (telefon raqami bilan kirish)

Foydalanuvchilarga yangi parolni xabar qilish yoki parolni tiklash oqimini
qo'shish kerak.

---

## QOLGAN QADAM: RLS ni yoqish (muhim, xavfsizlik)

Hozir barcha jadvallarda RLS **o'chirilgan** (`DISABLE_RLS.sql` ishga tushirilgan).
Anon key esa brauzer kodida, ya'ni **har qanday odam** hozir:

- barcha foydalanuvchi profillarini, telefon raqamlarini o'qiy oladi
- kurslarni, testlarni o'zgartira yoki o'chira oladi
- o'ziga premium obuna yozib qo'ya oladi
- to'lovlarni "tasdiqlangan" holatiga o'tkaza oladi

Bu tekshirib ko'rilgan va tasdiqlangan (anon key bilan `UPDATE courses` o'tdi).

### Qanday yoqish

Supabase CLI yoki DB paroli mavjud bo'lmagani uchun buni qo'lda bajarish kerak:

1. Supabase Dashboard → **SQL Editor** ni ochish
2. `shared/scripts/rls-policies.sql` faylini to'liq nusxalash
3. SQL Editor ga qo'yib **Run** bosish

Fayl idempotent — bir necha marta ishga tushirsa ham xato bermaydi.

### Keyin tekshirish

```bash
npm run check-rls   # xavfsizlik: hozir 14 ta muammo, keyin 0 bo'lishi kerak
npm run verify      # funksionallik: 58 ta sinov, hammasi OK bo'lishi kerak
```

`check-rls` hozirgi holatda 14 ta `XAVF` ko'rsatadi. RLS yoqilgach hammasi
`OK` bo'lishi kerak.

`verify` da biror joyda `XATO` chiqsa — tegishli siyosat juda qattiq,
xato xabari qaysi jadval ekanini ko'rsatadi.

`rls-policies.sql` Firebase `firestore.rules` dagi mantiqni takrorlaydi:

- Kurs materiallari (kurslar, mavzular, misollar, testlar) — hamma o'qiydi,
  faqat admin yozadi
- O'quvchi faqat o'z progressi, natijalari, sevimlilarini yozadi
- Reyting uchun boshqa o'quvchilarning progressi/natijasi o'qishga ochiq
- Obunani faqat admin yaratadi (o'quvchi o'ziga premium yozib qo'ymasligi uchun)
- To'lov so'rovini o'quvchi `pending` holatda yaratadi, admin tasdiqlaydi
- `settings` — `platform` va `author` ommaviy, qolganlari login talab qiladi

---

## Skriptlar

| Buyruq | Vazifa |
|---|---|
| `npm run migrate` | To'liq migratsiya (Firestore + Auth + Storage) |
| `npm run migrate:finish` | Yakunlash: settings kolleksiyalari, FK tushganlar, dublikatlar |
| `npm run migrate:finish -- --dry-run` | O'zgartirmasdan nima bo'lishini ko'rsatish |
| `npm run verify` | 58 ta uchdan-uchiga sinov (login + o'qish + yozish) |
| `npm run check-rls` | Xavfsizlik tekshiruvi: mehmon/o'quvchi/admin nimani ko'radi |
| `npm run reset-passwords` | Parollarni qayta belgilash |

---

## Firebase ni o'chirish

Kod endi Firebase SDK ni ishlatmaydi. `shared/src/index.ts` dan Firebase
eksporti olib tashlandi (bundle hajmi kamaydi). `shared/src/firebase.ts` fayli
migratsiya tarixini saqlash uchun qoldirildi — Firebase butunlay o'chirilgach,
uni ham `firestore.rules`, `firestore.indexes.json`,
`firebase-service-account.json`, `users.json` bilan birga o'chirish mumkin.

`.env` dagi `VITE_FIREBASE_*` va `EXPO_PUBLIC_FIREBASE_*` o'zgaruvchilari ham
endi kerak emas.
