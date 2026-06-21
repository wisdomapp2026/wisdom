/**
 * Stale-While-Revalidate cache strategiyasi.
 * 
 * Telegram kabi tez ishlash uchun:
 * 1. localStorage'dan eski datani DARHOL qaytaradi (0ms loading)
 * 2. Fonda Firestore'dan yangi data olib keladi
 * 3. Yangi data kelsa — keshni yangilaydi va callback chaqiradi
 * 
 * Bu usulda sahifa hech qachon "Yuklanmoqda..." ko'rsatmaydi (agar oldin ochilgan bo'lsa).
 */

const STORAGE_PREFIX = "edukids_cache_";
const MEMORY_CACHE = new Map<string, { data: any; timestamp: number }>();

// Qancha vaqtdan keyin fonda yangilash kerak (5 daqiqa)
const REVALIDATE_AFTER = 5 * 60 * 1000;
// localStorage'dagi data qancha vaqtgacha ishlatilishi mumkin (24 soat — shundan keyin loading ko'rsatamiz)
const MAX_STALE_AGE = 24 * 60 * 60 * 1000;

/** localStorage ga yozish */
function writeToStorage(key: string, data: any): void {
  try {
    const entry = { data, timestamp: Date.now() };
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(entry));
  } catch {
    // localStorage to'lgan bo'lishi mumkin — eski keshlarni tozalash
    cleanOldStorage();
  }
}

/** localStorage dan o'qish */
function readFromStorage(key: string): { data: any; timestamp: number } | null {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** Eski keshlarni tozalash (24 soatdan eski) */
function cleanOldStorage(): void {
  const cutoff = Date.now() - MAX_STALE_AGE;
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(STORAGE_PREFIX)) {
      try {
        const entry = JSON.parse(localStorage.getItem(key) || "");
        if (entry.timestamp < cutoff) keysToRemove.push(key);
      } catch {
        keysToRemove.push(key!);
      }
    }
  }
  keysToRemove.forEach((k) => localStorage.removeItem(k));
}

/**
 * Asosiy cache funksiyasi — Stale-While-Revalidate
 * 
 * @param key - Unique kalit (masalan "all-courses")
 * @param fetchFunc - Firestore'dan data olish funksiyasi
 * @param onUpdateOrTtl - Fonda yangilanganda UI ni yangilash uchun callback YOKI eski TTL (number — e'tiborsiz qoldiriladi)
 * @returns Darhol mavjud datani qaytaradi (agar kesh bor bo'lsa)
 */
export async function cachedFetch<T>(
  key: string,
  fetchFunc: () => Promise<T>,
  onUpdateOrTtl?: ((newData: T) => void) | number
): Promise<T> {
  const onUpdate = typeof onUpdateOrTtl === "function" ? onUpdateOrTtl : undefined;
  // 1. In-memory cache tekshirish (eng tez)
  const memEntry = MEMORY_CACHE.get(key);
  if (memEntry) {
    const age = Date.now() - memEntry.timestamp;
    if (age < REVALIDATE_AFTER) {
      // Hali yangi — darhol qaytaramiz, fonda so'rov yubormaymiz
      return memEntry.data;
    }
    // Stale lekin mavjud — darhol qaytaramiz, fonda yangilaymiz
    revalidateInBackground(key, fetchFunc, onUpdate);
    return memEntry.data;
  }

  // 2. localStorage tekshirish
  const stored = readFromStorage(key);
  if (stored) {
    const age = Date.now() - stored.timestamp;
    // Memory ga ham yozamiz
    MEMORY_CACHE.set(key, stored);

    if (age < MAX_STALE_AGE) {
      // Stale lekin qabul qilinarli — darhol qaytaramiz, fonda yangilaymiz
      revalidateInBackground(key, fetchFunc, onUpdate);
      return stored.data;
    }
    // Juda eski — lekin baribir ko'rsatamiz, fonda yangilaymiz
    revalidateInBackground(key, fetchFunc, onUpdate);
    return stored.data;
  }

  // 3. Kesh yo'q — birinchi marta — Firestore'dan olish shart
  const data = await fetchFunc();
  MEMORY_CACHE.set(key, { data, timestamp: Date.now() });
  writeToStorage(key, data);
  return data;
}

/** Fonda yangilash — UI ni bloklamaydi */
const revalidatingKeys = new Set<string>();

function revalidateInBackground<T>(
  key: string,
  fetchFunc: () => Promise<T>,
  onUpdate?: (newData: T) => void
): void {
  // Bir xil key uchun bir vaqtda faqat bitta revalidation
  if (revalidatingKeys.has(key)) return;
  revalidatingKeys.add(key);

  fetchFunc()
    .then((freshData) => {
      MEMORY_CACHE.set(key, { data: freshData, timestamp: Date.now() });
      writeToStorage(key, freshData);
      // UI ni yangilash (agar callback berilgan bo'lsa)
      if (onUpdate) {
        onUpdate(freshData);
      }
    })
    .catch(() => {
      // Offline bo'lishi mumkin — eski kesh ishlatiladi
    })
    .finally(() => {
      revalidatingKeys.delete(key);
    });
}

/**
 * Ma'lum bir keshni o'chirish (yangilash kerak bo'lganda)
 */
export function invalidateCache(key: string): void {
  MEMORY_CACHE.delete(key);
  localStorage.removeItem(STORAGE_PREFIX + key);
}

/**
 * Prefiks bo'yicha keshlarni o'chirish
 */
export function invalidateCacheByPrefix(prefix: string): void {
  // Memory
  for (const key of MEMORY_CACHE.keys()) {
    if (key.startsWith(prefix)) MEMORY_CACHE.delete(key);
  }
  // localStorage
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(STORAGE_PREFIX + prefix)) keysToRemove.push(k);
  }
  keysToRemove.forEach((k) => localStorage.removeItem(k));
}

/**
 * Butun keshni tozalash
 */
export function clearAllCache(): void {
  MEMORY_CACHE.clear();
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(STORAGE_PREFIX)) keysToRemove.push(k);
  }
  keysToRemove.forEach((k) => localStorage.removeItem(k));
}
