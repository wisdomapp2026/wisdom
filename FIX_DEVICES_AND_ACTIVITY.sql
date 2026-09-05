-- ============================================================
-- WISDOM — USER_DEVICES VA USER_ACTIVITY TUZATISH
-- Supabase Dashboard > SQL Editor ga qo'yib RUN tugmasini bosing!
-- ============================================================

-- 1. user_devices jadvaliga yetishmayotgan ustunlarni qo'shish
ALTER TABLE user_devices ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE user_devices ADD COLUMN IF NOT EXISTS last_seen BIGINT DEFAULT (extract(epoch from now()) * 1000)::bigint;

-- Browser va OS ustunlarini majburiy emas qilish (not null ni olib tashlash)
ALTER TABLE user_devices ALTER COLUMN browser DROP NOT NULL;
ALTER TABLE user_devices ALTER COLUMN os DROP NOT NULL;
ALTER TABLE user_devices ALTER COLUMN last_active_at DROP NOT NULL;

-- 2. Foydalanuvchi endi kirayotganda yoki mehmon bo'lganda 409 Conflict bermasligi uchun:
ALTER TABLE user_activity DROP CONSTRAINT IF EXISTS user_activity_user_id_fkey;
ALTER TABLE user_devices DROP CONSTRAINT IF EXISTS user_devices_user_id_fkey;

-- 3. RLS siyosatlari
DROP POLICY IF EXISTS "Devices: self or admin" ON user_devices;
CREATE POLICY "Devices: self or admin" ON user_devices FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Activity: self or admin" ON user_activity;
CREATE POLICY "Activity: self or admin" ON user_activity FOR ALL USING (true) WITH CHECK (true);
