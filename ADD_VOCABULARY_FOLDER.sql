-- ============================================================
-- WISDOM — LUG'ATLAR BAZASI UCHUN PAPKA (FOLDER) USTUNI QO'SHISH
-- Supabase Dashboard > SQL Editor ga qo'yib RUN tugmasini bosing!
-- ============================================================

-- 1. vocabularies jadvaliga folder ustunini qo'shish
ALTER TABLE vocabularies ADD COLUMN IF NOT EXISTS folder TEXT DEFAULT 'Umumiy';

-- 2. Qidiruv tezligini oshirish uchun indeks yaratish
CREATE INDEX IF NOT EXISTS idx_vocabularies_folder ON vocabularies (folder);
