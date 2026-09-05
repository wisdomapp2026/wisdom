import { supabase, toCamel, toSnake } from "../supabase";
import type { Vocabulary, StudentWordStat } from "../types";

/** Barcha lug'atlarni olish yoki filtr bo'yicha */
export async function getVocabularies(filter?: {
  level?: string;
  search?: string;
  limit?: number;
}): Promise<Vocabulary[]> {
  try {
    let query = supabase.from("vocabularies").select("*").order("created_at", { ascending: false });

    if (filter?.level && filter.level !== "all") {
      query = query.eq("level", filter.level);
    }

    if (filter?.search && filter.search.trim()) {
      const q = filter.search.trim();
      query = query.or(`word.ilike.%${q}%,translation.ilike.%${q}%,definition.ilike.%${q}%`);
    }

    if (filter?.limit) {
      query = query.limit(filter.limit);
    }

    const { data, error } = await query;
    if (error || !data) return [];
    return toCamel<Vocabulary[]>(data);
  } catch (err) {
    console.error("getVocabularies error:", err);
    return [];
  }
}

/** ID bo'yicha bitta lug'atni olish */
export async function getVocabularyById(id: string): Promise<Vocabulary | null> {
  try {
    const { data, error } = await supabase.from("vocabularies").select("*").eq("id", id).maybeSingle();
    if (error || !data) return null;
    return toCamel<Vocabulary>(data);
  } catch {
    return null;
  }
}

/** ID lar ro'yxati bo'yicha lug'atlarni olish (mavzu lug'atlari uchun) */
export async function getVocabulariesByIds(ids: string[]): Promise<Vocabulary[]> {
  if (!ids || ids.length === 0) return [];
  try {
    const { data, error } = await supabase.from("vocabularies").select("*").in("id", ids);
    if (error || !data) return [];
    return toCamel<Vocabulary[]>(data);
  } catch (err) {
    console.error("getVocabulariesByIds error:", err);
    return [];
  }
}

/** Yangi so'z qo'shish */
export async function createVocabulary(vocab: Partial<Vocabulary>): Promise<Vocabulary> {
  const now = Date.now();
  const item = {
    ...vocab,
    createdAt: vocab.createdAt || now,
    updatedAt: now,
  };

  const snake = toSnake(item);
  const { data, error } = await supabase.from("vocabularies").insert(snake).select().single();
  if (error) throw new Error(error.message);
  return toCamel<Vocabulary>(data);
}

/** Bir nechta so'zni birdaniga qo'shish (Excel / CSV import uchun) */
export async function bulkCreateVocabularies(items: Partial<Vocabulary>[]): Promise<number> {
  if (!items || items.length === 0) return 0;
  const now = Date.now();
  const formatted = items.map((it) =>
    toSnake({
      ...it,
      createdAt: it.createdAt || now,
      updatedAt: now,
    })
  );

  const { data, error } = await supabase.from("vocabularies").insert(formatted).select();
  if (error) throw new Error(error.message);
  return data?.length || 0;
}

/** So'zni tahrirlash */
export async function updateVocabulary(id: string, data: Partial<Vocabulary>): Promise<void> {
  const snake = toSnake({
    ...data,
    updatedAt: Date.now(),
  });
  const { error } = await supabase.from("vocabularies").update(snake).eq("id", id);
  if (error) throw new Error(error.message);
}

/** So'zni o'chirish */
export async function deleteVocabulary(id: string): Promise<void> {
  const { error } = await supabase.from("vocabularies").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/** O'quvchi so'z statistikasini saqlash (o'yinlar yoki takrorlash uchun) */
export async function saveStudentWordStat(stat: {
  userId: string;
  wordId: string;
  learned?: boolean;
  isCorrect?: boolean;
}): Promise<void> {
  const id = `${stat.userId}_${stat.wordId}`;
  const now = Date.now();

  // Avvalgi natijani tekshirish
  const { data: existing } = await supabase
    .from("student_word_stats")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  const prev = existing ? toCamel<StudentWordStat>(existing) : null;
  const correctCount = (prev?.correctCount || 0) + (stat.isCorrect ? 1 : 0);
  const wrongCount = (prev?.wrongCount || 0) + (stat.isCorrect === false ? 1 : 0);
  const learned = stat.learned !== undefined ? stat.learned : correctCount >= 3;

  const row = toSnake({
    id,
    userId: stat.userId,
    wordId: stat.wordId,
    learned,
    correctCount,
    wrongCount,
    lastReviewedAt: now,
  });

  const { error } = await supabase.from("student_word_stats").upsert(row);
  if (error) console.error("saveStudentWordStat error:", error);
}

/** O'quvchining barcha so'z statistikasini olish */
export async function getStudentWordStats(userId: string): Promise<StudentWordStat[]> {
  try {
    const { data, error } = await supabase
      .from("student_word_stats")
      .select("*")
      .eq("user_id", userId);
    if (error || !data) return [];
    return toCamel<StudentWordStat[]>(data);
  } catch {
    return [];
  }
}
