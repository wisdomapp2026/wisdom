-- =============================================================
-- EduKids — Supabase RLS (Row Level Security) siyosatlari
--
-- Bu fayl Firebase `firestore.rules` dagi huquqlar modelini
-- PostgreSQL ga ko'chiradi.
--
-- ISHLATISH:
--   Supabase Dashboard -> SQL Editor -> bu faylni to'liq nusxalab
--   "Run" tugmasini bosing. Fayl idempotent: bir necha marta
--   ishga tushirsa ham xato bermaydi.
--
-- MUHIM: `service_role` kaliti RLS ni chetlab o'tadi, shuning uchun
--   migratsiya/seed skriptlari bu siyosatlardan qat'i nazar ishlaydi.
-- =============================================================


-- =============================================================
-- 0. YORDAMCHI FUNKSIYA: joriy foydalanuvchi admin mi?
--
-- `users` jadvalining o'ziga qarab tekshiradi. SECURITY DEFINER
-- bo'lgani uchun RLS rekursiyasi yuzaga kelmaydi (aks holda
-- "users ni o'qish uchun users ni o'qish kerak" degan halqa hosil bo'ladi).
-- =============================================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated;


-- =============================================================
-- 1. RLS NI BARCHA JADVALLARDA YOQISH
-- =============================================================

ALTER TABLE users                ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories           ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses              ENABLE ROW LEVEL SECURITY;
ALTER TABLE folders              ENABLE ROW LEVEL SECURITY;
ALTER TABLE topics               ENABLE ROW LEVEL SECURITY;
ALTER TABLE problems             ENABLE ROW LEVEL SECURITY;
ALTER TABLE tests                ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_lists           ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_results         ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress        ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments             ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages             ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites            ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity        ENABLE ROW LEVEL SECURITY;
ALTER TABLE news_items           ENABLE ROW LEVEL SECURITY;
ALTER TABLE home_banners         ENABLE ROW LEVEL SECURITY;
ALTER TABLE testimonials         ENABLE ROW LEVEL SECURITY;
ALTER TABLE motivational_phrases ENABLE ROW LEVEL SECURITY;
ALTER TABLE motivation_settings  ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_links         ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_codes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_notifications  ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificates         ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_devices         ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings             ENABLE ROW LEVEL SECURITY;
ALTER TABLE advices              ENABLE ROW LEVEL SECURITY;


-- =============================================================
-- 2. ESKI SIYOSATLARNI O'CHIRISH (idempotentlik uchun)
-- =============================================================

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;


-- =============================================================
-- 3. OMMAVIY KONTENT (kurs materiallari)
--
-- Firebase da bu jadvallar `allow read: if true` edi — mehmon
-- (login qilmagan) foydalanuvchi ham kurslarni ko'rishi kerak.
-- Yozish faqat admin uchun.
-- =============================================================

DO $$
DECLARE
  t text;
  public_tables text[] := ARRAY[
    'courses', 'categories', 'folders', 'topics', 'problems',
    'tests', 'test_lists', 'news_items', 'home_banners',
    'testimonials', 'motivational_phrases', 'motivation_settings',
    'social_links', 'advices'
  ];
BEGIN
  FOREACH t IN ARRAY public_tables LOOP
    -- Hamma o'qiy oladi (mehmon ham)
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR SELECT USING (true)',
      t || '_read_all', t
    );
    -- Faqat admin o'zgartiradi
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR INSERT TO authenticated WITH CHECK (public.is_admin())',
      t || '_insert_admin', t
    );
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin())',
      t || '_update_admin', t
    );
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR DELETE TO authenticated USING (public.is_admin())',
      t || '_delete_admin', t
    );
  END LOOP;
END $$;


-- =============================================================
-- 3b. TESTIMONIALS — o'quvchi otziv qoldirishi
--
-- O'quvchi kurs haqida fikr yozadi (AuthorModal), lekin u
-- `is_active = false` bo'lib yaratiladi — admin tasdiqlagach
-- bosh sahifada ko'rinadi. Shuning uchun yuqoridagi "faqat admin
-- yozadi" siyosatiga qo'shimcha INSERT ruxsati beriladi.
-- =============================================================

CREATE POLICY testimonials_insert_own_pending ON testimonials
  FOR INSERT TO authenticated
  WITH CHECK (is_active = false OR public.is_admin());


-- =============================================================
-- 4. USERS — profillar
--
-- O'quvchi o'z profilini ko'radi/tahrirlaydi.
-- Admin barcha profillarni ko'radi va boshqaradi (ban, o'chirish).
-- MUHIM: reyting/leaderboard uchun boshqa o'quvchilarning ismi va
-- avatari kerak, shuning uchun authenticated foydalanuvchilarga
-- SELECT ruxsati beriladi (Firebase da ham `allow read: if isAuthenticated()` edi).
-- Mehmon (anon) esa profillarni ko'rmaydi.
-- =============================================================

CREATE POLICY users_read_authenticated ON users
  FOR SELECT TO authenticated USING (true);

CREATE POLICY users_insert_own ON users
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE POLICY users_update_own_or_admin ON users
  FOR UPDATE TO authenticated
  USING (auth.uid() = id OR public.is_admin())
  WITH CHECK (auth.uid() = id OR public.is_admin());

CREATE POLICY users_delete_admin ON users
  FOR DELETE TO authenticated USING (public.is_admin());


-- =============================================================
-- 5. FOYDALANUVCHIGA TEGISHLI MA'LUMOTLAR
--
-- Har bir o'quvchi faqat o'z yozuvlarini boshqaradi.
-- Admin hammasini ko'radi (statistika, analitika uchun).
-- =============================================================

-- user_progress: reyting (leaderboard) uchun kursdagi barcha
-- progresslarni o'qish kerak, shuning uchun SELECT authenticated ga ochiq.
CREATE POLICY user_progress_read ON user_progress
  FOR SELECT TO authenticated USING (true);

CREATE POLICY user_progress_insert_own ON user_progress
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY user_progress_update_own ON user_progress
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

CREATE POLICY user_progress_delete_admin ON user_progress
  FOR DELETE TO authenticated USING (public.is_admin());

-- test_results: reyting uchun o'qish ochiq, yozish faqat o'ziga
CREATE POLICY test_results_read ON test_results
  FOR SELECT TO authenticated USING (true);

CREATE POLICY test_results_insert_own ON test_results
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY test_results_update_own ON test_results
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

CREATE POLICY test_results_delete_admin ON test_results
  FOR DELETE TO authenticated USING (public.is_admin());

-- favorites: faqat o'ziga
CREATE POLICY favorites_own ON favorites
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY favorites_insert_own ON favorites
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY favorites_update_own ON favorites
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY favorites_delete_own ON favorites
  FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.is_admin());

-- user_activity: admin statistikada ko'radi
CREATE POLICY user_activity_read ON user_activity
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY user_activity_insert_own ON user_activity
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY user_activity_update_own ON user_activity
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

CREATE POLICY user_activity_delete_admin ON user_activity
  FOR DELETE TO authenticated USING (public.is_admin());

-- user_devices: qurilma sessiyalari.
-- Admin "3 ta qurilmadan foydalanmoqda" ogohlantirishi uchun hammasini ko'radi.
CREATE POLICY user_devices_read ON user_devices
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY user_devices_insert_own ON user_devices
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY user_devices_update_own ON user_devices
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- O'chirish: o'z qurilmasini yoki admin kick qilishi mumkin
CREATE POLICY user_devices_delete ON user_devices
  FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.is_admin());

-- certificates: o'quvchi o'zining, admin hammasini ko'radi
CREATE POLICY certificates_read ON certificates
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY certificates_insert_own ON certificates
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id OR public.is_admin());

CREATE POLICY certificates_update_admin ON certificates
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY certificates_delete_admin ON certificates
  FOR DELETE TO authenticated USING (public.is_admin());


-- =============================================================
-- 6. OBUNALAR VA TO'LOVLAR
--
-- Obunani FAQAT admin yaratadi (to'lovni tasdiqlaganda) — o'quvchi
-- o'ziga premium obuna yozib qo'ya olmasligi kerak.
-- To'lov so'rovini o'quvchi yaratadi, admin tasdiqlaydi.
-- =============================================================

CREATE POLICY subscriptions_read ON subscriptions
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY subscriptions_insert_admin ON subscriptions
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());

CREATE POLICY subscriptions_update_admin ON subscriptions
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY subscriptions_delete_admin ON subscriptions
  FOR DELETE TO authenticated USING (public.is_admin());

CREATE POLICY payments_read ON payments
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_admin());

-- O'quvchi faqat o'zi nomidan "pending" to'lov so'rovi yaratadi
CREATE POLICY payments_insert_own ON payments
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND (status = 'pending' OR public.is_admin()));

CREATE POLICY payments_update_admin ON payments
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY payments_delete_admin ON payments
  FOR DELETE TO authenticated USING (public.is_admin());


-- =============================================================
-- 7. XABARLAR (o'quvchi <-> admin chat)
-- =============================================================

CREATE POLICY messages_read ON messages
  FOR SELECT TO authenticated
  USING (auth.uid() = from_user_id OR auth.uid() = to_user_id OR public.is_admin());

CREATE POLICY messages_insert ON messages
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = from_user_id OR public.is_admin());

-- O'qilgan belgisini qo'yish: qabul qiluvchi yoki admin
CREATE POLICY messages_update ON messages
  FOR UPDATE TO authenticated
  USING (auth.uid() = to_user_id OR public.is_admin())
  WITH CHECK (auth.uid() = to_user_id OR public.is_admin());

CREATE POLICY messages_delete_admin ON messages
  FOR DELETE TO authenticated USING (public.is_admin());


-- =============================================================
-- 8. PROMO KODLAR
--
-- Login qilgan foydalanuvchi kodni tekshirishi kerak, shuning uchun
-- SELECT ochiq. UPDATE ham kerak — `usePromoCodeAtomic()` used_count ni
-- oshiradi. Yaratish/o'chirish faqat admin.
-- =============================================================

CREATE POLICY promo_codes_read ON promo_codes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY promo_codes_update ON promo_codes
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY promo_codes_insert_admin ON promo_codes
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());

CREATE POLICY promo_codes_delete_admin ON promo_codes
  FOR DELETE TO authenticated USING (public.is_admin());


-- =============================================================
-- 9. ADMIN BILDIRISHNOMALARI
--
-- O'quvchi to'lov qilganda bildirishnoma yaratadi (INSERT),
-- lekin ularni o'qiy olmaydi — faqat admin ko'radi.
-- =============================================================

CREATE POLICY admin_notifications_read_admin ON admin_notifications
  FOR SELECT TO authenticated USING (public.is_admin());

CREATE POLICY admin_notifications_insert ON admin_notifications
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY admin_notifications_update_admin ON admin_notifications
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY admin_notifications_delete_admin ON admin_notifications
  FOR DELETE TO authenticated USING (public.is_admin());


-- =============================================================
-- 10. SETTINGS (kalit-qiymat sozlamalar)
--
-- Bu jadval bir necha xil maqsadda ishlatiladi:
--   'platform'              -> tema, karta raqami, narxlar (mehmon ham o'qiydi)
--   'author'                -> muallif ma'lumoti (ommaviy)
--   'studentNotifications'  -> o'quvchi bildirishnomalari (login kerak)
--   'testLibrary'           -> admin test kutubxonasi
--   'testBuilderQuestions'  -> admin savol bazasi
--   'testBuilderFolders'    -> admin papkalari
--
-- Mehmon faqat 'platform' va 'author' ni o'qiydi.
-- 'studentNotifications' ga login qilganlar yozadi (o'qilgan belgisi uchun).
-- Qolganlarini faqat admin boshqaradi.
-- =============================================================

CREATE POLICY settings_read_public ON settings
  FOR SELECT USING (key IN ('platform', 'author'));

CREATE POLICY settings_read_authenticated ON settings
  FOR SELECT TO authenticated USING (true);

CREATE POLICY settings_write_notifications ON settings
  FOR INSERT TO authenticated
  WITH CHECK (key = 'studentNotifications' OR public.is_admin());

CREATE POLICY settings_update_notifications ON settings
  FOR UPDATE TO authenticated
  USING (key = 'studentNotifications' OR public.is_admin())
  WITH CHECK (key = 'studentNotifications' OR public.is_admin());

CREATE POLICY settings_delete_admin ON settings
  FOR DELETE TO authenticated USING (public.is_admin());


-- =============================================================
-- 10b. RPC: kursdagi o'quvchilar hisoblagichini oshirish
--
-- O'quvchi kursga qo'shilganda `courses.total_students` oshishi kerak,
-- lekin `courses` ni faqat admin o'zgartira oladi. SECURITY DEFINER
-- funksiya bu bitta amalni xavfsiz tarzda ruxsat beradi — o'quvchi
-- kursning boshqa maydonlariga tegib keta olmaydi.
-- =============================================================

CREATE OR REPLACE FUNCTION public.increment_course_students(p_course_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.courses
  SET total_students = COALESCE(total_students, 0) + 1
  WHERE id = p_course_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_course_students(text) TO authenticated;


-- =============================================================
-- 11. STORAGE (edukids bucket)
--
-- Rasm/video/fayllarni login qilgan foydalanuvchi yuklaydi
-- (avatar, to'lov cheki), o'qish ommaviy (bucket public).
-- =============================================================

DROP POLICY IF EXISTS "edukids_read_public"    ON storage.objects;
DROP POLICY IF EXISTS "edukids_insert_auth"    ON storage.objects;
DROP POLICY IF EXISTS "edukids_update_auth"    ON storage.objects;
DROP POLICY IF EXISTS "edukids_delete_admin"   ON storage.objects;

CREATE POLICY "edukids_read_public" ON storage.objects
  FOR SELECT USING (bucket_id = 'edukids');

CREATE POLICY "edukids_insert_auth" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'edukids');

CREATE POLICY "edukids_update_auth" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'edukids') WITH CHECK (bucket_id = 'edukids');

CREATE POLICY "edukids_delete_admin" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'edukids' AND public.is_admin());


-- =============================================================
-- TEKSHIRUV: siyosatlar ro'yxati
-- =============================================================

SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
