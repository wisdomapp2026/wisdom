-- ============================================================
-- tushunGo — Row Level Security (RLS) Policies
-- Supabase Dashboard > SQL Editor da ishga tushiring
-- ============================================================

-- 1. RLS yoqilganligini ta'minlash
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE problems ENABLE ROW LEVEL SECURITY;
ALTER TABLE tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorite_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_sessions ENABLE ROW LEVEL SECURITY;

-- 2. USERS — foydalanuvchi faqat o'zini o'qiy/yoza oladi, admin hammani
DROP POLICY IF EXISTS "Users: read own profile" ON users;
CREATE POLICY "Users: read own profile" ON users FOR SELECT
  USING (auth.uid() = id OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Users: update own profile" ON users;
CREATE POLICY "Users: update own profile" ON users FOR UPDATE
  USING (auth.uid() = id OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Users: insert own" ON users;
CREATE POLICY "Users: insert own" ON users FOR INSERT
  WITH CHECK (auth.uid() = id OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Users: admin delete" ON users;
CREATE POLICY "Users: admin delete" ON users FOR DELETE
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- 3. COURSES, TOPICS, PROBLEMS — hamma o'qiy oladi, faqat admin yoza oladi
DROP POLICY IF EXISTS "Courses: public read" ON courses;
CREATE POLICY "Courses: public read" ON courses FOR SELECT USING (true);

DROP POLICY IF EXISTS "Courses: admin write" ON courses;
CREATE POLICY "Courses: admin write" ON courses FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Topics: public read" ON topics;
CREATE POLICY "Topics: public read" ON topics FOR SELECT USING (true);

DROP POLICY IF EXISTS "Topics: admin write" ON topics;
CREATE POLICY "Topics: admin write" ON topics FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Problems: public read" ON problems;
CREATE POLICY "Problems: public read" ON problems FOR SELECT USING (true);

DROP POLICY IF EXISTS "Problems: admin write" ON problems;
CREATE POLICY "Problems: admin write" ON problems FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Tests: public read" ON tests;
CREATE POLICY "Tests: public read" ON tests FOR SELECT USING (true);

DROP POLICY IF EXISTS "Tests: admin write" ON tests;
CREATE POLICY "Tests: admin write" ON tests FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- 4. USER_PROGRESS — foydalanuvchi faqat o'zini yoza/o'qiy oladi
DROP POLICY IF EXISTS "Progress: own data" ON user_progress;
CREATE POLICY "Progress: own data" ON user_progress FOR ALL
  USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- 5. MESSAGES — foydalanuvchi o'ziga tegishli xabarlarni ko'radi/yozadi
DROP POLICY IF EXISTS "Messages: own or admin" ON messages;
CREATE POLICY "Messages: own or admin" ON messages FOR ALL
  USING (
    auth.uid() = from_user_id 
    OR auth.uid() = to_user_id 
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- 6. SUBSCRIPTIONS — foydalanuvchi faqat o'zini ko'radi
DROP POLICY IF EXISTS "Subscriptions: own or admin" ON subscriptions;
CREATE POLICY "Subscriptions: own or admin" ON subscriptions FOR ALL
  USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- 7. PAYMENTS — foydalanuvchi faqat o'zini ko'radi
DROP POLICY IF EXISTS "Payments: own or admin" ON payments;
CREATE POLICY "Payments: own or admin" ON payments FOR ALL
  USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- 8. SETTINGS — hamma o'qiy oladi, faqat admin yozadi
DROP POLICY IF EXISTS "Settings: public read" ON settings;
CREATE POLICY "Settings: public read" ON settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Settings: admin write" ON settings;
CREATE POLICY "Settings: admin write" ON settings FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- 9. ADMIN_NOTIFICATIONS — faqat admin
DROP POLICY IF EXISTS "AdminNotif: admin only" ON admin_notifications;
CREATE POLICY "AdminNotif: admin only" ON admin_notifications FOR SELECT
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "AdminNotif: anyone create" ON admin_notifications;
CREATE POLICY "AdminNotif: anyone create" ON admin_notifications FOR INSERT WITH CHECK (true);

-- 10. CERTIFICATES — foydalanuvchi o'zini ko'radi
DROP POLICY IF EXISTS "Certificates: own or admin" ON certificates;
CREATE POLICY "Certificates: own or admin" ON certificates FOR ALL
  USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- 11. FAVORITE_TOPICS — foydalanuvchi faqat o'zini
DROP POLICY IF EXISTS "Favorites: own" ON favorite_topics;
CREATE POLICY "Favorites: own" ON favorite_topics FOR ALL
  USING (auth.uid() = user_id);

-- 12. DEVICE_SESSIONS — foydalanuvchi faqat o'zini
DROP POLICY IF EXISTS "Devices: own" ON device_sessions;
CREATE POLICY "Devices: own" ON device_sessions FOR ALL
  USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
