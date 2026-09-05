-- ============================================================
-- WISDOM — STORAGE BUCKET VA COURSES CHEKLOVINI TUZATISH
-- Supabase Dashboard > SQL Editor ga qo'yib RUN tugmasini bosing!
-- ============================================================

-- 1. Kurslar jadvalidagi qat'iy Foreign Key cheklovini olib tashlash
ALTER TABLE courses DROP CONSTRAINT IF EXISTS courses_created_by_fkey;
ALTER TABLE courses ALTER COLUMN created_by DROP NOT NULL;

ALTER TABLE promo_codes DROP CONSTRAINT IF EXISTS promo_codes_created_by_fkey;
ALTER TABLE promo_codes ALTER COLUMN created_by DROP NOT NULL;

-- 2. Storage Bucket yaratish ('edukids' va 'wisdom' nomlari bilan)
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES 
  ('edukids', 'edukids', true, 524288000),
  ('wisdom', 'wisdom', true, 524288000)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 3. Storage uchun ruxsatlar (RLS siyosatlari)
DROP POLICY IF EXISTS "Public storage select" ON storage.objects;
CREATE POLICY "Public storage select" ON storage.objects FOR SELECT USING (bucket_id IN ('edukids', 'wisdom'));

DROP POLICY IF EXISTS "Public storage insert" ON storage.objects;
CREATE POLICY "Public storage insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id IN ('edukids', 'wisdom'));

DROP POLICY IF EXISTS "Public storage update" ON storage.objects;
CREATE POLICY "Public storage update" ON storage.objects FOR UPDATE USING (bucket_id IN ('edukids', 'wisdom'));

DROP POLICY IF EXISTS "Public storage delete" ON storage.objects;
CREATE POLICY "Public storage delete" ON storage.objects FOR DELETE USING (bucket_id IN ('edukids', 'wisdom'));
