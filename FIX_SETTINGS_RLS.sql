-- Settings jadvalini hamma o'qiy olsin (anon/authenticated)
-- Supabase SQL Editor'da ishga tushiring

DROP POLICY IF EXISTS "Settings: public read" ON settings;
CREATE POLICY "Settings: public read" ON settings FOR SELECT USING (true);

-- Admin faqat yoza oladi (update/insert/delete)
DROP POLICY IF EXISTS "Settings: admin write" ON settings;
CREATE POLICY "Settings: admin write" ON settings FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Settings: admin update" ON settings;
CREATE POLICY "Settings: admin update" ON settings FOR UPDATE
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Settings: admin delete" ON settings;
CREATE POLICY "Settings: admin delete" ON settings FOR DELETE
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
