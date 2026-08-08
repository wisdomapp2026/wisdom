/**
 * Auth userlar uchun profile yaratish
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

const now = Date.now();

async function fixProfiles() {
  console.log("👤 User profilelarni tuzatish...\n");

  // Barcha Auth userlarni olish
  const { data: authUsers, error: listErr } = await supabase.auth.admin.listUsers();
  if (listErr) {
    console.error("❌ Auth userlarni olishda xato:", listErr.message);
    process.exit(1);
  }

  console.log(`  ${authUsers.users.length} ta Auth user topildi\n`);

  for (const authUser of authUsers.users) {
    console.log(`  ${authUser.email}...`);
    
    // Profile mavjudligini tekshirish
    const { data: existingProfile } = await supabase
      .from("users")
      .select("id")
      .eq("id", authUser.id)
      .maybeSingle();

    if (existingProfile) {
      console.log(`    ✅ Profile mavjud`);
      continue;
    }

    // Profile yaratish
    const isAdmin = authUser.email?.includes("admin");
    const phone = authUser.phone || authUser.email?.replace("@edukids.uz", "") || "+998901234567";
    const name = authUser.user_metadata?.name || (isAdmin ? "Admin" : "O'quvchi");

    const { error: insertErr } = await supabase.from("users").insert({
      id: authUser.id,
      phone: phone.startsWith("+") ? phone : `+${phone}`,
      name: name,
      role: isAdmin ? "admin" : "student",
      created_at: now,
      updated_at: now
    });

    if (insertErr) {
      console.log(`    ❌ Profile yaratishda xato: ${insertErr.message}`);
    } else {
      console.log(`    ✅ Profile yaratildi (${name}, ${isAdmin ? 'admin' : 'student'})`);
    }
  }

  console.log("\n✅ Tayyor!");
  process.exit(0);
}

fixProfiles().catch((err) => {
  console.error("❌ Xatolik:", err);
  process.exit(1);
});
