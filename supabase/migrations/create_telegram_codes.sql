-- Telegram orqali kirish uchun tasdiqlash kodlari jadvali
CREATE TABLE IF NOT EXISTS telegram_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  telegram_id TEXT NOT NULL,
  phone TEXT NOT NULL,
  code TEXT NOT NULL,
  first_name TEXT DEFAULT '',
  last_name TEXT DEFAULT '',
  username TEXT DEFAULT '',
  expires_at BIGINT NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indekslar
CREATE INDEX IF NOT EXISTS idx_telegram_codes_telegram_id ON telegram_codes(telegram_id);
CREATE INDEX IF NOT EXISTS idx_telegram_codes_code ON telegram_codes(code);

-- Eskirgan kodlarni avtomatik tozalash (ixtiyoriy)
-- Har kuni bir marta ishlatish mumkin:
-- DELETE FROM telegram_codes WHERE expires_at < extract(epoch from now()) * 1000;
