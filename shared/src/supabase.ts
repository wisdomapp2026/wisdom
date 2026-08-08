import { createClient } from "@supabase/supabase-js";
// js-md5 nomlangan eksport beradi (`export var md5: Hash`) — default import ishlamaydi
import { md5 } from "js-md5";

/**
 * Supabase client initialization
 * Vite (admin-web): import.meta.env.VITE_*
 * Expo (student-app): process.env.EXPO_PUBLIC_*
 */
function getEnv(viteKey: string, expoKey: string): string {
  // Vite environment
  if (typeof import.meta !== "undefined" && (import.meta as any).env) {
    return (import.meta as any).env[viteKey] || "";
  }
  // Node/Expo environment
  if (typeof process !== "undefined" && process.env) {
    return process.env[expoKey] || "";
  }
  return "";
}

const supabaseUrl = getEnv("VITE_SUPABASE_URL", "EXPO_PUBLIC_SUPABASE_URL");
const supabaseAnonKey = getEnv("VITE_SUPABASE_ANON_KEY", "EXPO_PUBLIC_SUPABASE_ANON_KEY");

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase URL or Anon Key is missing in environment variables.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  }
});

// Helper: snake_case to camelCase mapping for top-level keys
export function toCamel<T = any>(obj: any): T {
  if (!obj) return obj;
  if (Array.isArray(obj)) return obj.map(toCamel) as any;
  if (typeof obj !== "object") return obj;
  
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    let camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    // Custom overrides if necessary
    if (camelKey === 'totalXp') camelKey = 'totalXP';
    if (camelKey === 'testXp') camelKey = 'testXP';
    result[camelKey] = value;
  }
  return result as T;
}

// Helper: camelCase to snake_case mapping for top-level keys
export function toSnake(obj: any): any {
  if (!obj || typeof obj !== "object") return obj;
  
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    let snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    if (key === 'totalXP') snakeKey = 'total_xp';
    if (key === 'testXP') snakeKey = 'test_xp';
    result[snakeKey] = value;
  }
  return result;
}

/**
 * Firebase UID (yoki boshqa matnli ID) ni PostgreSQL UUID ga deterministik map qilish.
 *
 * MUHIM: bu yerda ataylab BO'SH (relaxed) UUID shakli tekshiriladi —
 * `8-4-4-4-12` hex bloklari. RFC4122 ning qat'iy versiya/variant nibble
 * tekshiruvi ishlatilmaydi, chunki Firebase→Supabase migratsiyasida
 * foydalanuvchi ID lari md5 hash asosida yasalgan va ularning ko'pchiligi
 * RFC4122 ga mos kelmaydi. Qat'iy regex ishlatilsa, Supabase Auth dan
 * kelgan haqiqiy user.uid qaytadan hash qilinib, profil topilmay qoladi
 * va foydalanuvchi tizimdan chiqarib tashlanadi.
 */
const UUID_SHAPE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function stringToUUID(str: string): string {
  if (!str) return "";
  // Eski ma'lumotlarda `createdBy: "admin"` uchrashi mumkin — asl admin profiliga bog'laymiz
  if (str === "admin") str = "admin-001";

  if (UUID_SHAPE.test(str)) return str.toLowerCase();

  const hash = md5(str);
  return `${hash.substring(0, 8)}-${hash.substring(8, 12)}-${hash.substring(12, 16)}-${hash.substring(16, 20)}-${hash.substring(20, 32)}`;
}

export async function uploadFile(bucket: string, path: string, file: File | Blob): Promise<string> {
  const { error } = await supabase.storage.from(bucket).upload(path, file);
  if (error) throw error;
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

export default supabase;
