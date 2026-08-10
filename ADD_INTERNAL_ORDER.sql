-- Tests jadvaliga yangi ustunlar qo'shish
-- Supabase Dashboard > SQL Editor da ishga tushiring

ALTER TABLE tests ADD COLUMN IF NOT EXISTS internal_order INTEGER;
ALTER TABLE tests ADD COLUMN IF NOT EXISTS shuffle_options BOOLEAN DEFAULT false;
ALTER TABLE tests ADD COLUMN IF NOT EXISTS timer_enabled BOOLEAN DEFAULT true;
