-- ============================================================
-- WISDOM — ADVICES JADVALINI TO'G'RILASH
-- Supabase Dashboard > SQL Editor ga qo'yib RUN tugmasini bosing!
-- ============================================================

ALTER TABLE advices ADD COLUMN IF NOT EXISTS after_topic_order BIGINT NOT NULL DEFAULT 0;
ALTER TABLE advices ADD COLUMN IF NOT EXISTS folder_id TEXT;
ALTER TABLE advices ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE advices ADD COLUMN IF NOT EXISTS icon TEXT;
ALTER TABLE advices ADD COLUMN IF NOT EXISTS updated_at BIGINT DEFAULT (extract(epoch from now()) * 1000)::bigint;
