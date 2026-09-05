# 🚀 Wisdom — Supabase va GitHub ga ulash bo'yicha to'liq qo'llanma

Ushbu qo'llanma orqali siz:
1. Yangi **Supabase** loyihasini noldan ochib, bazani ishga tushirasiz.
2. Kalitlarni `.env` ga ulab, dasturni yangi bazaga bog'laysiz.
3. Yangi **GitHub** hisobingizga loyihani xavfsiz yuklaysiz.

---

## 1-QISM: SUPABASE DA YANGI LOYIHA YARATISH VA ULASH

### 1-qadam: Yangi Supabase loyihasi ochish
1. [supabase.com](https://supabase.com) saytiga kiring va profilingizga o'ting.
2. **"New project"** (Yangi loyiha) tugmasini bosing.
3. Ma'lumotlarni to'ldiring:
   - **Name**: `wisdom-english` (yoki o'zingiz istagan nom)
   - **Database Password**: Kuchli parol o'ylab toping va uni eslab qoling.
   - **Region**: O'zbekistonga eng yaqini: `Central EU (Frankfurt)` yoki `West EU (London)`.
4. **"Create new project"** tugmasini bosing va loyiha sozlanishini 1-2 daqiqa kuting.

---

### 2-qadam: Ma'lumotlar bazasi jadvallarini yaratish (SQL Editor)
Loyiha tayyor bo'lgach:
1. Chap tarafdagi menyudan **SQL Editor** (terminal belgisi) bo'limiga kiring.
2. **"New query"** tugmasini bosing.
3. Loyihamizdagi tayyor [WISDOM_SCHEMA.sql](file:///c:/Users/user/Desktop/WISDOM3/WISDOM_SCHEMA.sql) faylining **barcha kodini** nusxalang (Ctrl+A, Ctrl+C).
4. SQL Editor oynasiga qo'ying (Ctrl+V).
5. Pastki o'ng burchakdagi yashil **"Run"** tugmasini bosing.
   > Natijada barcha jadvallar (`vocabularies`, `courses`, `topics`, `tests`, `users`, va barcha RLS siyosatlari) bir zumda yaratiladi!

---

### 3-qadam: Storage (Media fayllar va Rasmlar uchun) ochish
Rasmlar va videolarni yuklash uchun:
1. Chap menyudan **Storage** bo'limiga kiring.
2. **"New bucket"** tugmasini bosing.
3. Bucket nomi: `media` deb yozing.
4. **"Public bucket"** degan joyiga ✅ belgi (galochka) qo'ying (bu o'quvchilar rasmlarni ko'ra olishi uchun shart).
5. **"Save"** tugmasini bosing.

---

### 4-qadam: API Kalitlarni olish va `.env` fayllariga qo'yish
1. Supabase chap menyusi pastidagi **Project Settings** (tishli g'ildirakcha / sozlamalar) bo'limiga kiring.
2. **API** bo'limini tanlang.
3. U yerdan 2 ta kalitni nusxalang:
   - **Project URL**: `https://xxxxxxxxxxxx.supabase.co`
   - **Project API keys** bo'limidagi **`anon / public`** kaliti: `eyJhbGciOi...`

4. Endi ushbu kalitlarni loyihamizdagi quyidagi 3 ta faylga joylashtiring:
   - `c:\Users\user\Desktop\WISDOM3\.env`
   - `c:\Users\user\Desktop\WISDOM3\admin-web\.env`
   - `c:\Users\user\Desktop\WISDOM3\student-app\.env`

Namuna ko'rinishi:
```env
VITE_SUPABASE_URL=https://sizning-yangi-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

### 5-qadam: Birinchi Admin foydalanuvchini yaratish
Admin panelga kirish uchun:
1. Supabase panelida **Authentication > Users** bo'limiga kiring.
2. **"Add user"** > **"Create user"** tugmasini bosing.
3. Email va parol kiriting (Masalan: `admin@wisdom.uz`, parol: `admin12345`).
4. "Auto Confirm User" ga belgi qo'ying va yarating.
5. Foydalanuvchiga **admin** rolini berish uchun **SQL Editor**ga o'tib, quyidagi buyruqni bosing (emailni o'zingiznikiga almashtiring):

```sql
INSERT INTO users (id, phone, name, role, created_at, updated_at)
SELECT id, '+998901234567', 'Bosh Admin', 'admin', 
       EXTRACT(EPOCH FROM NOW()) * 1000, 
       EXTRACT(EPOCH FROM NOW()) * 1000
FROM auth.users
WHERE email = 'admin@wisdom.uz'
ON CONFLICT (id) DO UPDATE SET role = 'admin';
```
Shundan so'ng ushbu email va parol bilan [http://localhost:5173/login](http://localhost:5173/login) orqali Admin panelga bemalol kira olasiz!

---

## 2-QISM: GITHUB GA YANGI REPOZITORIYA OCHIB ULASH

### 1-qadam: GitHub da yangi Repo yaratish
1. [github.com](https://github.com) saytiga yangi akkauntingiz bilan kiring.
2. Yuqori o'ng burchakdagi **"+"** tugmasini bosib, **"New repository"** ni tanlang.
3. **Repository name**: `wisdom` deb nomlang.
4. **Public** yoki **Private** ligini tanlang.
5. ⚠️ **MUHIM**: "Add a README file", ".gitignore" yoki "license" bandlariga **galochka qo'ymang** (bo'sh repo bo'lsin).
6. **"Create repository"** tugmasini bosing.
7. Chiqqan sahifadan repozitoriy havolasini nusxalang:
   Masalan: `https://github.com/sizning-akkaunt/wisdom.git`

---

### 2-qadam: Loyihani GitHub ga yuklash (Terminal buyruqlari)

VS Code yoki Antigravity IDE terminalida (loyiha ildizida turib) quyidagi buyruqlarni birma-bir bajaring:

```powershell
# 1. Eski git bog'lanishini tozalash (eski edukids reposidan uzish)
git remote remove origin

# 2. Yangi repo manzilini o'rnatish (o'zingizning havolangizni qo'ying)
git remote add origin https://github.com/sizning-akkaunt/wisdom.git

# 3. Barcha yangi o'zgarishlarni tayyorlash
git add .

# 4. Commit qilish
git commit -m "feat: Wisdom ingliz tili ta'lim platformasi boshlang'ich versiyasi"

# 5. Asosiy tarmoqni main deb belgilash
git branch -M main

# 6. GitHub ga yuklash (push)
git push -u origin main
```

> **Eslatma**: Agar `git push` qilganingizda GitHub login/parol so'rasa:
> - GitHub profilingizdan **Settings > Developer Settings > Personal access tokens (Tokens classic)** bo'limiga o'ting.
> - Yangi token (repo ruxsati bilan) yaratib, parol so'ragan joyga shu tokenni kiriting.

---

🎉 **Tabriklaymiz!** Loyihangiz to'liq yangi Supabase bazasiga ulandi va GitHub ga yuklandi!
Har doim savollaringiz bo'lsa yordam berishga tayyorman.
