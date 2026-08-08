/**
 * Barcha device sessiyalarni o'chirish
 */

import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../../.env") });

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

async function clearDevices() {
  console.log("🧹 Barcha device sessiyalarni o'chirish...\n");

  const { error } = await supabase.from("user_devices").delete().neq("id", "_nonexistent_");

  if (error) {
    console.error("❌ Xatolik:", error.message);
    process.exit(1);
  }

  console.log("✅ Barcha device sessiyalar o'chirildi");
  console.log("   Endi login qiling\n");
  process.exit(0);
}

clearDevices();
