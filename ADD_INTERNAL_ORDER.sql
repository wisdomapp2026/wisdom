-- Tests jadvaliga internal_order ustunini qo'shish
-- Bu ustun test'ning mavzu ichidagi tartibini (misollar orasidagi pozitsiyasini) saqlaydi
ALTER TABLE tests ADD COLUMN IF NOT EXISTS internal_order INTEGER;
