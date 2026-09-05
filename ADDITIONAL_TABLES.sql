-- ============================================================
-- WISDOM — QO'SHIMCHA JADVALLAR (Bosh sahifa, Yangiliklar, Bannerlar, Notifikatsiyalar)
-- Supabase Dashboard > SQL Editor ga qo'yib RUN tugmasini bosing!
-- ============================================================

-- 1. Bannerlar (home_banners)
CREATE TABLE IF NOT EXISTS home_banners (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    subtitle TEXT,
    button_text TEXT NOT NULL,
    course_id TEXT REFERENCES courses(id) ON DELETE CASCADE,
    link_url TEXT,
    bg_color TEXT NOT NULL DEFAULT '#1e293b',
    image_url TEXT,
    image_position TEXT,
    image_fit TEXT,
    image_full_width BOOLEAN DEFAULT false,
    image_opacity BIGINT DEFAULT 100,
    image_url_desktop TEXT,
    image_position_desktop TEXT,
    image_fit_desktop TEXT,
    image_opacity_desktop BIGINT,
    image_crop_top BIGINT DEFAULT 0,
    image_crop_bottom BIGINT DEFAULT 0,
    text_color TEXT,
    text_opacity BIGINT DEFAULT 100,
    show_button BOOLEAN DEFAULT true,
    button_position TEXT,
    is_active BOOLEAN DEFAULT true,
    "order" BIGINT NOT NULL DEFAULT 0,
    created_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint,
    updated_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint
);

-- 2. Yangiliklar (news_items)
CREATE TABLE IF NOT EXISTS news_items (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    body TEXT,
    "type" TEXT NOT NULL DEFAULT 'news',
    image_url TEXT,
    image_url_desktop TEXT,
    video_url TEXT,
    video_type TEXT,
    duration TEXT,
    link_url TEXT,
    is_active BOOLEAN DEFAULT true,
    "order" BIGINT NOT NULL DEFAULT 0,
    created_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint,
    updated_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint
);

-- 3. Fikrlar / Otzivlar (testimonials)
CREATE TABLE IF NOT EXISTS testimonials (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    avatar_url TEXT,
    role TEXT,
    text TEXT NOT NULL,
    rating BIGINT NOT NULL DEFAULT 5,
    is_active BOOLEAN DEFAULT true,
    "order" BIGINT DEFAULT 999,
    created_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint,
    updated_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint
);

-- 4. Ijtimoiy tarmoqlar (social_links)
CREATE TABLE IF NOT EXISTS social_links (
    id TEXT PRIMARY KEY,
    course_id TEXT REFERENCES courses(id) ON DELETE CASCADE,
    platform TEXT NOT NULL,
    label TEXT NOT NULL,
    url TEXT NOT NULL,
    icon_url TEXT,
    is_active BOOLEAN DEFAULT true,
    "order" BIGINT NOT NULL DEFAULT 0,
    created_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint,
    updated_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint
);

-- 5. Admin bildirishnomalari (admin_notifications)
CREATE TABLE IF NOT EXISTS admin_notifications (
    id TEXT PRIMARY KEY,
    "type" TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    data JSONB,
    created_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint
);

-- 6. Motivatsion iqtiboslar (motivational_phrases)
CREATE TABLE IF NOT EXISTS motivational_phrases (
    id TEXT PRIMARY KEY,
    placement TEXT NOT NULL,
    text TEXT NOT NULL,
    "order" BIGINT NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint
);

-- 7. Motivatsiya sozlamalari (motivation_settings)
CREATE TABLE IF NOT EXISTS motivation_settings (
    id TEXT PRIMARY KEY,
    placement TEXT NOT NULL,
    rotate_hours BIGINT NOT NULL DEFAULT 24,
    display_order TEXT NOT NULL DEFAULT 'random',
    updated_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint
);

-- 8. Promokodlar (promo_codes)
CREATE TABLE IF NOT EXISTS promo_codes (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    discount_percent BIGINT NOT NULL,
    max_uses BIGINT NOT NULL DEFAULT 100,
    used_count BIGINT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    expires_at BIGINT,
    created_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- 9. Maslahatlar (advices)
CREATE TABLE IF NOT EXISTS advices (
    id TEXT PRIMARY KEY,
    course_id TEXT REFERENCES courses(id) ON DELETE CASCADE,
    folder_id TEXT REFERENCES folders(id) ON DELETE CASCADE,
    title TEXT,
    text TEXT NOT NULL,
    icon TEXT,
    after_topic_order BIGINT NOT NULL DEFAULT 0,
    "order" BIGINT NOT NULL DEFAULT 0,
    created_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint,
    updated_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint
);

-- ============================================================
-- RLS (ROW LEVEL SECURITY) YOQISH VA RUXSATLAR BERISH
-- ============================================================

ALTER TABLE home_banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE news_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE motivational_phrases ENABLE ROW LEVEL SECURITY;
ALTER TABLE motivation_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE advices ENABLE ROW LEVEL SECURITY;

-- Eski siyosatlarni tozalash (xato bermasligi uchun):
DROP POLICY IF EXISTS "Public read home_banners" ON home_banners;
DROP POLICY IF EXISTS "Admin write home_banners" ON home_banners;
DROP POLICY IF EXISTS "Public read news_items" ON news_items;
DROP POLICY IF EXISTS "Admin write news_items" ON news_items;
DROP POLICY IF EXISTS "Public read testimonials" ON testimonials;
DROP POLICY IF EXISTS "Testimonials insert" ON testimonials;
DROP POLICY IF EXISTS "Admin write testimonials" ON testimonials;
DROP POLICY IF EXISTS "Public read social_links" ON social_links;
DROP POLICY IF EXISTS "Admin write social_links" ON social_links;
DROP POLICY IF EXISTS "Admin all notifications" ON admin_notifications;
DROP POLICY IF EXISTS "Public read motivational_phrases" ON motivational_phrases;
DROP POLICY IF EXISTS "Admin write motivational_phrases" ON motivational_phrases;
DROP POLICY IF EXISTS "Public read motivation_settings" ON motivation_settings;
DROP POLICY IF EXISTS "Admin write motivation_settings" ON motivation_settings;
DROP POLICY IF EXISTS "Public read promo_codes" ON promo_codes;
DROP POLICY IF EXISTS "Admin write promo_codes" ON promo_codes;
DROP POLICY IF EXISTS "Public read advices" ON advices;
DROP POLICY IF EXISTS "Admin write advices" ON advices;

-- O'qish (Hamma uchun ochiq):
CREATE POLICY "Public read home_banners" ON home_banners FOR SELECT USING (true);
CREATE POLICY "Public read news_items" ON news_items FOR SELECT USING (true);
CREATE POLICY "Public read testimonials" ON testimonials FOR SELECT USING (true);
CREATE POLICY "Testimonials insert" ON testimonials FOR INSERT WITH CHECK (true);
CREATE POLICY "Public read social_links" ON social_links FOR SELECT USING (true);
CREATE POLICY "Public read motivational_phrases" ON motivational_phrases FOR SELECT USING (true);
CREATE POLICY "Public read motivation_settings" ON motivation_settings FOR SELECT USING (true);
CREATE POLICY "Public read promo_codes" ON promo_codes FOR SELECT USING (true);
CREATE POLICY "Public read advices" ON advices FOR SELECT USING (true);

-- Admin huquqlari (Faqat admin o'zgartira oladi):
CREATE POLICY "Admin write home_banners" ON home_banners FOR ALL USING (is_admin());
CREATE POLICY "Admin write news_items" ON news_items FOR ALL USING (is_admin());
CREATE POLICY "Admin write testimonials" ON testimonials FOR ALL USING (is_admin());
CREATE POLICY "Admin write social_links" ON social_links FOR ALL USING (is_admin());
CREATE POLICY "Admin all notifications" ON admin_notifications FOR ALL USING (is_admin());
CREATE POLICY "Admin write motivational_phrases" ON motivational_phrases FOR ALL USING (is_admin());
CREATE POLICY "Admin write motivation_settings" ON motivation_settings FOR ALL USING (is_admin());
CREATE POLICY "Admin write promo_codes" ON promo_codes FOR ALL USING (is_admin());
CREATE POLICY "Admin write advices" ON advices FOR ALL USING (is_admin());
