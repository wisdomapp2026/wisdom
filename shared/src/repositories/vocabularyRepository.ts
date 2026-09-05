import { supabase, toCamel, toSnake } from "../supabase";
import type { Vocabulary, StudentWordStat } from "../types";

/** Lug'at obyektida papka nomini to'g'rilash (agar folder ustuni bo'lmasa, tags dan oladi) */
export function normalizeVocabFolder(v: Vocabulary): Vocabulary {
  if (!v) return v;
  if (!v.folder || v.folder.trim() === "") {
    const tagFolder = Array.isArray(v.tags)
      ? v.tags.find((t: any) => typeof t === "string" && t.startsWith("folder:"))?.replace("folder:", "")
      : undefined;
    v.folder = tagFolder?.trim() || "Umumiy";
  }
  return v;
}

/** Barcha lug'atlarni olish yoki filtr bo'yicha */
export async function getVocabularies(filter?: {
  level?: string;
  search?: string;
  folder?: string;
  limit?: number;
}): Promise<Vocabulary[]> {
  try {
    let query = supabase.from("vocabularies").select("*").order("created_at", { ascending: false });

    if (filter?.level && filter.level !== "all" && filter.level !== "All") {
      query = query.eq("level", filter.level);
    }

    if (filter?.folder && filter.folder !== "all" && filter.folder !== "All") {
      query = query.eq("folder", filter.folder);
    }

    if (filter?.search && filter.search.trim()) {
      const q = filter.search.trim();
      query = query.or(`word.ilike.%${q}%,translation.ilike.%${q}%,definition.ilike.%${q}%`);
    }

    if (filter?.limit) {
      query = query.limit(filter.limit);
    }

    const { data, error } = await query;
    if (error) {
      // Agar xato "folder" ustuni mavjud emasligidan bo'lsa, foldersiz so'rov qilamiz
      if (error.message?.includes("folder") || error.code === "42703") {
        let fallbackQuery = supabase.from("vocabularies").select("*").order("created_at", { ascending: false });
        if (filter?.level && filter.level !== "all" && filter.level !== "All") {
          fallbackQuery = fallbackQuery.eq("level", filter.level);
        }
        if (filter?.search && filter.search.trim()) {
          const q = filter.search.trim();
          fallbackQuery = fallbackQuery.or(`word.ilike.%${q}%,translation.ilike.%${q}%,definition.ilike.%${q}%`);
        }
        const { data: fbData } = await fallbackQuery;
        if (!fbData) return [];
        const list = toCamel<Vocabulary[]>(fbData).map(normalizeVocabFolder);
        if (filter?.folder && filter.folder !== "all" && filter.folder !== "All") {
          return list.filter((item) => item.folder === filter.folder);
        }
        return list;
      }
      return [];
    }

    if (!data) return [];
    return toCamel<Vocabulary[]>(data).map(normalizeVocabFolder);
  } catch (err) {
    console.error("getVocabularies error:", err);
    return [];
  }
}

/** Mavjud barcha papkalar ro'yxatini olish */
export async function getAllFolders(): Promise<string[]> {
  try {
    const list = await getVocabularies();
    const set = new Set<string>();
    set.add("Umumiy");
    list.forEach((v) => {
      if (v.folder && v.folder.trim()) {
        set.add(v.folder.trim());
      }
    });
    return Array.from(set);
  } catch {
    return ["Umumiy"];
  }
}

/** ID bo'yicha bitta lug'atni olish */
export async function getVocabularyById(id: string): Promise<Vocabulary | null> {
  try {
    const { data, error } = await supabase.from("vocabularies").select("*").eq("id", id).maybeSingle();
    if (error || !data) return null;
    return normalizeVocabFolder(toCamel<Vocabulary>(data));
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
    return toCamel<Vocabulary[]>(data).map(normalizeVocabFolder);
  } catch (err) {
    console.error("getVocabulariesByIds error:", err);
    return [];
  }
}

/** Yangi so'z qo'shish */
export async function createVocabulary(vocab: Partial<Vocabulary>): Promise<Vocabulary> {
  const now = Date.now();
  const folder = vocab.folder?.trim() || "Umumiy";
  const tags = Array.isArray(vocab.tags) ? [...vocab.tags] : [];
  if (!tags.some((t: string) => typeof t === "string" && t.startsWith("folder:"))) {
    tags.push(`folder:${folder}`);
  }

  const item = {
    ...vocab,
    folder,
    tags,
    createdAt: vocab.createdAt || now,
    updatedAt: now,
  };

  const snake = toSnake(item);
  let { data, error } = await supabase.from("vocabularies").insert(snake).select().single();

  // Agar baza jadvalida "folder" ustuni hali bo'lmasa, uni olib tashlab insert qilamiz
  if (error && (error.message?.includes("folder") || error.code === "42703")) {
    const fallback = { ...snake };
    delete fallback.folder;
    const res = await supabase.from("vocabularies").insert(fallback).select().single();
    data = res.data;
    error = res.error;
  }

  if (error) throw new Error(error.message);
  return normalizeVocabFolder(toCamel<Vocabulary>(data));
}

/** Bir nechta so'zni birdaniga qo'shish (Excel / CSV import uchun) */
export async function bulkCreateVocabularies(items: Partial<Vocabulary>[], defaultFolder?: string): Promise<number> {
  if (!items || items.length === 0) return 0;
  const now = Date.now();
  const formatted = items.map((it) => {
    const folder = it.folder?.trim() || defaultFolder?.trim() || "Umumiy";
    const tags = Array.isArray(it.tags) ? [...it.tags] : [];
    if (!tags.some((t: string) => typeof t === "string" && t.startsWith("folder:"))) {
      tags.push(`folder:${folder}`);
    }
    return toSnake({
      ...it,
      folder,
      tags,
      createdAt: it.createdAt || now,
      updatedAt: now,
    });
  });

  let { data, error } = await supabase.from("vocabularies").insert(formatted).select();

  // Agar "folder" ustuni hali bazada bo'lmasa
  if (error && (error.message?.includes("folder") || error.code === "42703")) {
    const fallbacks = formatted.map((f) => {
      const copy = { ...f };
      delete copy.folder;
      return copy;
    });
    const res = await supabase.from("vocabularies").insert(fallbacks).select();
    data = res.data;
    error = res.error;
  }

  if (error) throw new Error(error.message);
  return data?.length || 0;
}

/** So'zni tahrirlash */
export async function updateVocabulary(id: string, data: Partial<Vocabulary>): Promise<void> {
  const folder = data.folder?.trim();
  const updatePayload: any = {
    ...data,
    updatedAt: Date.now(),
  };

  if (folder) {
    updatePayload.folder = folder;
    const tags = Array.isArray(data.tags) ? [...data.tags] : [];
    const filteredTags = tags.filter((t: string) => typeof t === "string" && !t.startsWith("folder:"));
    filteredTags.push(`folder:${folder}`);
    updatePayload.tags = filteredTags;
  }

  const snake = toSnake(updatePayload);
  let { error } = await supabase.from("vocabularies").update(snake).eq("id", id);

  if (error && (error.message?.includes("folder") || error.code === "42703")) {
    const fallback = { ...snake };
    delete fallback.folder;
    const res = await supabase.from("vocabularies").update(fallback).eq("id", id);
    error = res.error;
  }

  if (error) throw new Error(error.message);
}

/** Papka nomini o'zgartirish */
export async function renameVocabularyFolder(oldName: string, newName: string): Promise<void> {
  const from = oldName.trim();
  const to = newName.trim();
  if (!from || !to || from === to) return;

  const now = Date.now();
  // 1. folder ustunida yangilash
  try {
    await supabase.from("vocabularies").update({ folder: to, updated_at: now }).eq("folder", from);
  } catch {}

  // 2. tags JSONB dagi folder teglarini ham yangilash
  try {
    const { data: list } = await supabase.from("vocabularies").select("id, tags, folder");
    if (list) {
      for (const raw of list) {
        const item = normalizeVocabFolder(toCamel<Vocabulary>(raw));
        if (item.folder === from) {
          const tags = (item.tags || []).filter((t: string) => typeof t === "string" && !t.startsWith("folder:"));
          tags.push(`folder:${to}`);
          await updateVocabulary(item.id, { folder: to, tags });
        }
      }
    }
  } catch (e) {
    console.warn("renameVocabularyFolder tags sync warning:", e);
  }
}

/** Papkani o'chirish (so'zlarni 'Umumiy' ga ko'chirish yoki to'liq o'chirish) */
export async function deleteVocabularyFolder(folderName: string, deleteWords = false): Promise<void> {
  const name = folderName.trim();
  if (!name) return;

  if (deleteWords) {
    try {
      await supabase.from("vocabularies").delete().eq("folder", name);
    } catch {}
    // tags orqali ham tozalash
    const list = await getVocabularies();
    for (const item of list) {
      if (item.folder === name) {
        await deleteVocabulary(item.id);
      }
    }
  } else {
    if (name !== "Umumiy") {
      await renameVocabularyFolder(name, "Umumiy");
    }
  }
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
