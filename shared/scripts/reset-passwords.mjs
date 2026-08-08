/**
 * Userlarning parollarini reset qilish
 */

import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../../.env") });

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Env o'zgaruvchilar yo'q");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

// Barcha admin userlar uchun admin123, boshqalari 123456

async function resetPasswords() {
  console.log("🔑 Parollarni yangilash...\n");

  // Barcha userlarni olish
  const { data: allUsers, error: listErr } = await supabase.auth.admin.listUsers();
  if (listErr) {
    console.error("❌ Userlarni olishda xato:", listErr.message);
    process.exit(1);
  }

  console.log(`  ${allUsers.users.length} ta user topildi\n`);

  for (const user of allUsers.users) {
    const isAdmin = user.email?.includes("admin");
    const password = isAdmin ? "admin123" : "123456";

    console.log(`  ${user.email}...`);
    
    const { error } = await supabase.auth.admin.updateUserById(user.id, {
      password: password
    });

    if (error) {
      console.log(`    ❌ Xatolik: ${error.message}`);
    } else {
      console.log(`    ✅ Parol: ${password}`);
    }
  }

  console.log("\n✅ Tayyor! Login qilishingiz mumkin:\n");
  console.log("💼 ADMIN:");
  console.log("   Email: admin@edukids.uz");
  console.log("   Parol: admin123\n");
  console.log("📱 STUDENT:");
  console.log("   Telefon: +998901234567");
  console.log("   Parol: 123456\n");

  process.exit(0);
}

resetPasswords().catch((err) => {
  console.error("❌ Xatolik:", err);
  process.exit(1);
});
