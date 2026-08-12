-- ============================================================
-- DESKTOP RASM USTUNLARI (migratsiya)
--
-- Maqsad: admin bir xil kontent uchun MOBIL va DESKTOP rasmini
-- alohida yuklashi mumkin bo'lsin. Desktop maydoni bo'sh bo'lsa,
-- student app avtomatik mobil rasmga qaytadi (fallback).
--
-- Supabase SQL Editor da bir marta ishga tushiring.
-- Barcha buyruqlar IF NOT EXISTS — qayta ishga tushirish xavfsiz.
-- ============================================================

-- ---------- 1. COURSES ----------
-- Muqova (kartochka rasmi): mobil 800×450 px  |  desktop 1600×900 px (16:9)
ALTER TABLE courses ADD COLUMN IF NOT EXISTS cover_image_desktop TEXT;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS cover_position_desktop TEXT;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS cover_fit_desktop TEXT;

-- Hero (kurs sahifasi kitob muqovasi): mobil 300×400 px  |  desktop 600×800 px (3:4)
ALTER TABLE courses ADD COLUMN IF NOT EXISTS hero_image_desktop TEXT;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS hero_image_position_desktop TEXT;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS hero_image_fit_desktop TEXT;

-- ---------- 2. HOME BANNERS ----------
-- Banner: mobil 800×450 px (16:9)  |  desktop 2400×800 px (3:1)
ALTER TABLE home_banners ADD COLUMN IF NOT EXISTS image_url_desktop TEXT;
ALTER TABLE home_banners ADD COLUMN IF NOT EXISTS image_position_desktop TEXT;
ALTER TABLE home_banners ADD COLUMN IF NOT EXISTS image_fit_desktop TEXT;
ALTER TABLE home_banners ADD COLUMN IF NOT EXISTS image_opacity_desktop BIGINT;

-- ---------- 3. NEWS ITEMS ----------
-- Yangilik kartochkasi: mobil 320×440 px  |  desktop 640×880 px (8:11)
ALTER TABLE news_items ADD COLUMN IF NOT EXISTS image_url_desktop TEXT;

-- ---------- Tekshirish ----------
-- Ustunlar qo'shilganini ko'rish:
-- SELECT table_name, column_name FROM information_schema.columns
-- WHERE column_name LIKE '%_desktop' ORDER BY table_name, column_name;
