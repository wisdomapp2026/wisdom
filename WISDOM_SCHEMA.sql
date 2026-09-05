-- ============================================================
-- WISDOM — Ingliz Tili Ta'lim Platformasi
-- Supabase Database Schema (To'liq yangi loyiha uchun)
-- Supabase Dashboard > SQL Editor ga qo'yib RUN tugmasini bosing
-- ============================================================

-- 1. Foydalanuvchilar (users)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    phone TEXT NOT NULL,
    name TEXT NOT NULL,
    avatar TEXT,
    role TEXT NOT NULL CHECK (role IN ('admin', 'student')),
    grade TEXT,
    is_banned BOOLEAN DEFAULT false,
    banned_at BIGINT,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL
);

-- 2. Kategoriyalar (categories)
CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    "order" BIGINT NOT NULL,
    created_at BIGINT NOT NULL
);

-- 3. Kurslar (courses: masalan, IELTS, General English, CEFR)
CREATE TABLE IF NOT EXISTS courses (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    cover_image TEXT,
    cover_position TEXT,
    cover_fit TEXT,
    cover_image_desktop TEXT,
    cover_position_desktop TEXT,
    cover_fit_desktop TEXT,
    hero_image TEXT,
    hero_image_position TEXT,
    hero_image_fit TEXT,
    hero_image_desktop TEXT,
    hero_image_position_desktop TEXT,
    hero_image_fit_desktop TEXT,
    is_premium BOOLEAN DEFAULT false,
    is_hidden BOOLEAN DEFAULT false,
    show_on_homepage BOOLEAN DEFAULT true,
    price BIGINT,
    course_price BIGINT,
    pricing_type TEXT,
    subscription_plans JSONB,
    premium_benefits JSONB,
    total_students BIGINT DEFAULT 0,
    online_now BIGINT DEFAULT 0,
    test_after_every BIGINT DEFAULT 0,
    unlock_mode TEXT DEFAULT 'open',
    tags JSONB,
    "order" BIGINT NOT NULL,
    introduction JSONB,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- 4. Modullar / Papkalar (folders: masalan, English Beginner, Elementary, Intermediate)
CREATE TABLE IF NOT EXISTS folders (
    id TEXT PRIMARY KEY,
    course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    cover_image TEXT,
    "order" BIGINT NOT NULL,
    is_premium BOOLEAN DEFAULT false,
    is_hidden BOOLEAN DEFAULT false,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL
);

-- 5. Umumiy Lug'at Bazasi (vocabularies)
CREATE TABLE IF NOT EXISTS vocabularies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    word TEXT NOT NULL,
    phonetic TEXT,                     -- transkripsiya, masalan: /ˈæp.əl/
    translation TEXT NOT NULL,          -- o'zbekcha tarjimasi: olma
    part_of_speech TEXT,                -- noun, verb, adj, adverb, etc.
    definition TEXT,                    -- inglizcha izoh
    example_sentence TEXT,              -- I eat an apple every day.
    example_translation TEXT,           -- Men har kuni olma yeyman.
    audio_url TEXT,                     -- talaffuz audio havolasi
    image_url TEXT,                     -- so'z uchun rasm
    level TEXT DEFAULT 'A1',            -- A1, A2, B1, B2, C1, IELTS
    tags JSONB DEFAULT '[]'::jsonb,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_vocabularies_word ON vocabularies (word);
CREATE INDEX IF NOT EXISTS idx_vocabularies_level ON vocabularies (level);

-- 6. Mavzular (topics: Teoriya + Lug'atlar + Quiz)
CREATE TABLE IF NOT EXISTS topics (
    id TEXT PRIMARY KEY,
    course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    folder_id TEXT REFERENCES folders(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    icon TEXT,
    "order" BIGINT NOT NULL,
    is_premium BOOLEAN DEFAULT false,
    is_hidden BOOLEAN DEFAULT false,
    introduction JSONB,
    -- Teoriya bo'limi:
    theory_content TEXT,                -- Dars matni (HTML / Markdown / Text)
    theory_media JSONB DEFAULT '[]'::jsonb, -- [{ type: 'image'|'video', url: string, caption: string }]
    -- Ushbu mavzuga biriktirilgan so'zlar:
    vocabulary_ids JSONB DEFAULT '[]'::jsonb, -- Array of vocabulary UUIDs
    -- Ushbu mavzuga oid Quiz savollari:
    quiz_questions JSONB DEFAULT '[]'::jsonb, -- [{ id, question, options: [], correctAnswer: 0, explanation }]
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL
);

-- 7. Testlar (tests - umumiy kurs yoki modul imtihonlari)
CREATE TABLE IF NOT EXISTS tests (
    id TEXT PRIMARY KEY,
    course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    folder_id TEXT REFERENCES folders(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    version TEXT NOT NULL,
    status TEXT NOT NULL,
    is_premium BOOLEAN DEFAULT false,
    grade_level TEXT,
    subject TEXT,
    passing_score BIGINT NOT NULL,
    shuffle_questions BOOLEAN DEFAULT false,
    total_points BIGINT NOT NULL,
    total_time BIGINT NOT NULL,
    questions JSONB NOT NULL,
    after_topic_order BIGINT,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- 8. Test Natijalari (test_results)
CREATE TABLE IF NOT EXISTS test_results (
    id TEXT PRIMARY KEY,
    test_id TEXT REFERENCES tests(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    score BIGINT NOT NULL,
    correct_count BIGINT NOT NULL,
    total_questions BIGINT NOT NULL,
    time_taken BIGINT NOT NULL,
    grade TEXT NOT NULL,
    answers JSONB NOT NULL,
    completed_at BIGINT NOT NULL
);

-- 9. O'quvchi Progressi (user_progress)
CREATE TABLE IF NOT EXISTS user_progress (
    id TEXT PRIMARY KEY, -- user_id + course_id
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    completed_topics JSONB DEFAULT '[]'::jsonb,
    completed_quizzes JSONB DEFAULT '[]'::jsonb,
    current_topic_id TEXT,
    progress_percent BIGINT DEFAULT 0,
    total_xp BIGINT DEFAULT 0,
    streak BIGINT DEFAULT 0,
    weekly_minutes JSONB DEFAULT '[0,0,0,0,0,0,0]'::jsonb,
    last_accessed_at BIGINT NOT NULL,
    is_joined BOOLEAN DEFAULT false,
    enrolled_at BIGINT,
    test_xp BIGINT DEFAULT 0,
    test_results JSONB DEFAULT '{}'::jsonb
);

-- 10. O'quvchining So'z Yodlash va O'yinlar Statistikasi
CREATE TABLE IF NOT EXISTS student_word_stats (
    id TEXT PRIMARY KEY, -- user_id + '_' + word_id
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    word_id UUID NOT NULL REFERENCES vocabularies(id) ON DELETE CASCADE,
    learned BOOLEAN DEFAULT false,
    correct_count INT DEFAULT 0,
    wrong_count INT DEFAULT 0,
    last_reviewed_at BIGINT NOT NULL
);

-- 11. Obunalar (subscriptions)
CREATE TABLE IF NOT EXISTS subscriptions (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id TEXT REFERENCES courses(id) ON DELETE CASCADE,
    status TEXT NOT NULL,
    plan TEXT NOT NULL,
    price_per_month BIGINT NOT NULL,
    start_date BIGINT NOT NULL,
    end_date BIGINT NOT NULL,
    cancelled_at BIGINT,
    payment_method TEXT,
    promo_code TEXT
);

-- 12. To'lovlar (payments)
CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_name TEXT NOT NULL,
    subscription_id TEXT,
    course_id TEXT REFERENCES courses(id) ON DELETE CASCADE,
    course_title TEXT NOT NULL,
    amount BIGINT NOT NULL,
    method TEXT NOT NULL,
    status TEXT NOT NULL,
    promo_code TEXT,
    discount BIGINT DEFAULT 0,
    card_number TEXT,
    sender_phone TEXT,
    recipient_card TEXT,
    screenshot_url TEXT,
    confirmed_at BIGINT,
    created_at BIGINT NOT NULL
);

-- 13. Xabarlar (messages)
CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    from_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    from_name TEXT NOT NULL,
    from_role TEXT NOT NULL,
    to_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at BIGINT NOT NULL
);

-- 14. Sevimlilar (favorites)
CREATE TABLE IF NOT EXISTS favorites (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    topic_id TEXT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    topic_title TEXT NOT NULL,
    created_at BIGINT NOT NULL
);

-- 15. Foydalanuvchi faolligi (user_activity)
CREATE TABLE IF NOT EXISTS user_activity (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL,
    user_name TEXT NOT NULL,
    "date" TEXT NOT NULL,
    total_minutes BIGINT DEFAULT 0,
    sessions JSONB NOT NULL,
    last_active_at BIGINT NOT NULL
);

-- 16. Foydalanuvchi qurilmalari (user_devices)
CREATE TABLE IF NOT EXISTS user_devices (
    id TEXT PRIMARY KEY,
    device_id TEXT NOT NULL,
    user_id UUID NOT NULL,
    device_name TEXT NOT NULL,
    browser TEXT,
    os TEXT,
    last_seen BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint,
    created_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint,
    is_active BOOLEAN DEFAULT true
);

-- 17. Sozlamalar (settings)
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at BIGINT NOT NULL
);

-- 18. Sertifikatlar (certificates)
CREATE TABLE IF NOT EXISTS certificates (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_name TEXT NOT NULL,
    course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    course_title TEXT NOT NULL,
    score BIGINT NOT NULL,
    certificate_number TEXT NOT NULL,
    issue_date BIGINT NOT NULL,
    pdf_url TEXT
);

-- 19. Bannerlar (home_banners)
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

-- 20. Yangiliklar (news_items)
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

-- 21. Fikrlar / Otzivlar (testimonials)
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

-- 22. Ijtimoiy tarmoqlar (social_links)
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

-- 23. Admin bildirishnomalari (admin_notifications)
CREATE TABLE IF NOT EXISTS admin_notifications (
    id TEXT PRIMARY KEY,
    "type" TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    data JSONB,
    created_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint
);

-- 24. Motivatsion iqtiboslar (motivational_phrases)
CREATE TABLE IF NOT EXISTS motivational_phrases (
    id TEXT PRIMARY KEY,
    placement TEXT NOT NULL,
    text TEXT NOT NULL,
    "order" BIGINT NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint
);

-- 25. Motivatsiya sozlamalari (motivation_settings)
CREATE TABLE IF NOT EXISTS motivation_settings (
    id TEXT PRIMARY KEY,
    placement TEXT NOT NULL,
    rotate_hours BIGINT NOT NULL DEFAULT 24,
    display_order TEXT NOT NULL DEFAULT 'random',
    updated_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint
);

-- 26. Promokodlar (promo_codes)
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

-- 27. Maslahatlar (advices)
CREATE TABLE IF NOT EXISTS advices (
    id TEXT PRIMARY KEY,
    course_id TEXT REFERENCES courses(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    "order" BIGINT NOT NULL DEFAULT 0,
    created_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE vocabularies ENABLE ROW LEVEL SECURITY;
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_word_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE home_banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE news_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE motivational_phrases ENABLE ROW LEVEL SECURITY;
ALTER TABLE motivation_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE advices ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- REKURSIYASIZ ADMIN TEKSHIRUVI (SECURITY DEFINER)
-- ============================================================
CREATE OR REPLACE FUNCTION is_admin() 
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- O'qish hamma uchun ochiq bo'lgan jadvallar:
CREATE POLICY "Public read categories" ON categories FOR SELECT USING (true);
CREATE POLICY "Public read courses" ON courses FOR SELECT USING (true);
CREATE POLICY "Public read folders" ON folders FOR SELECT USING (true);
CREATE POLICY "Public read vocabularies" ON vocabularies FOR SELECT USING (true);
CREATE POLICY "Public read topics" ON topics FOR SELECT USING (true);
CREATE POLICY "Public read tests" ON tests FOR SELECT USING (true);
CREATE POLICY "Public read settings" ON settings FOR SELECT USING (true);
CREATE POLICY "Public read home_banners" ON home_banners FOR SELECT USING (true);
CREATE POLICY "Public read news_items" ON news_items FOR SELECT USING (true);
CREATE POLICY "Public read testimonials" ON testimonials FOR SELECT USING (true);
CREATE POLICY "Testimonials insert" ON testimonials FOR INSERT WITH CHECK (true);
CREATE POLICY "Public read social_links" ON social_links FOR SELECT USING (true);
CREATE POLICY "Public read motivational_phrases" ON motivational_phrases FOR SELECT USING (true);
CREATE POLICY "Public read motivation_settings" ON motivation_settings FOR SELECT USING (true);
CREATE POLICY "Public read promo_codes" ON promo_codes FOR SELECT USING (true);
CREATE POLICY "Public read advices" ON advices FOR SELECT USING (true);

-- Admin yozish huquqi:
CREATE POLICY "Admin write categories" ON categories FOR ALL USING (is_admin());
CREATE POLICY "Admin write courses" ON courses FOR ALL USING (is_admin());
CREATE POLICY "Admin write folders" ON folders FOR ALL USING (is_admin());
CREATE POLICY "Admin write vocabularies" ON vocabularies FOR ALL USING (is_admin());
CREATE POLICY "Admin write topics" ON topics FOR ALL USING (is_admin());
CREATE POLICY "Admin write tests" ON tests FOR ALL USING (is_admin());
CREATE POLICY "Admin write settings" ON settings FOR ALL USING (is_admin());
CREATE POLICY "Admin write home_banners" ON home_banners FOR ALL USING (is_admin());
CREATE POLICY "Admin write news_items" ON news_items FOR ALL USING (is_admin());
CREATE POLICY "Admin write testimonials" ON testimonials FOR ALL USING (is_admin());
CREATE POLICY "Admin write social_links" ON social_links FOR ALL USING (is_admin());
CREATE POLICY "Admin all notifications" ON admin_notifications FOR ALL USING (is_admin());
CREATE POLICY "Admin write motivational_phrases" ON motivational_phrases FOR ALL USING (is_admin());
CREATE POLICY "Admin write motivation_settings" ON motivation_settings FOR ALL USING (is_admin());
CREATE POLICY "Admin write promo_codes" ON promo_codes FOR ALL USING (is_admin());
CREATE POLICY "Admin write advices" ON advices FOR ALL USING (is_admin());

-- Foydalanuvchilar (users) — Rekursiyasiz xavfsiz siyosatlar:
CREATE POLICY "Users: read" ON users FOR SELECT USING (true);
CREATE POLICY "Users: insert self" ON users FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users: update self" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users: admin write" ON users FOR ALL USING (is_admin());

-- Boshqa jadvallar:
CREATE POLICY "Progress: self or admin" ON user_progress FOR ALL USING (auth.uid() = user_id OR is_admin());
CREATE POLICY "Word stats: self or admin" ON student_word_stats FOR ALL USING (auth.uid() = user_id OR is_admin());
CREATE POLICY "Test results: self or admin" ON test_results FOR ALL USING (auth.uid() = user_id OR is_admin());
CREATE POLICY "Subscriptions: self or admin" ON subscriptions FOR ALL USING (auth.uid() = user_id OR is_admin());
CREATE POLICY "Payments: self or admin" ON payments FOR ALL USING (auth.uid() = user_id OR is_admin());
CREATE POLICY "Messages: participants or admin" ON messages FOR ALL USING (auth.uid() = from_user_id OR auth.uid() = to_user_id OR is_admin());
CREATE POLICY "Favorites: self or admin" ON favorites FOR ALL USING (auth.uid() = user_id OR is_admin());
CREATE POLICY "Activity: self or admin" ON user_activity FOR ALL USING (auth.uid() = user_id OR is_admin());
CREATE POLICY "Devices: self or admin" ON user_devices FOR ALL USING (auth.uid() = user_id OR is_admin());
CREATE POLICY "Certificates: self or admin" ON certificates FOR ALL USING (auth.uid() = user_id OR is_admin());
