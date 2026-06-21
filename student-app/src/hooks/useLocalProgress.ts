/**
 * Login qilmagan foydalanuvchilar uchun progressni localStorage da saqlash.
 * Login qilgach, saqlangan progress DB ga yuboriladi.
 */
import { setUserProgress, getUserProgress, updateUserProgress } from "@shared/repositories";
import type { UserProgress } from "@shared/types";

const STORAGE_KEY = "edukids_local_progress";

/** Local storage'dan barcha progresslarni olish */
export function getLocalProgress(): Record<string, UserProgress> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/** Bitta kurs uchun local progressni olish */
export function getLocalCourseProgress(courseId: string): UserProgress | null {
  const all = getLocalProgress();
  return all[courseId] || null;
}

/** Local progressni saqlash (login bo'lmaganda) */
export function setLocalCourseProgress(courseId: string, progress: UserProgress): void {
  const all = getLocalProgress();
  all[courseId] = progress;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

/** Kursga "qo'shilish" — local progress yaratish (login yo'q bo'lganda) */
export function enrollLocalCourse(courseId: string): UserProgress {
  const now = Date.now();
  const progress: UserProgress = {
    id: `local_${courseId}`,
    userId: "local",
    courseId,
    completedTopics: [],
    completedProblems: [],
    progressPercent: 0,
    totalXP: 0,
    streak: 0,
    weeklyMinutes: [0, 0, 0, 0, 0, 0, 0],
    lastAccessedAt: now,
  };
  setLocalCourseProgress(courseId, progress);
  return progress;
}

/**
 * Login qilgandan keyin — local progresslarni DB ga yuborish.
 * Agar DB da allaqachon progress bor bo'lsa, merge qilamiz (ko'proq tugatilganlar saqlanadi).
 * Faqat muvaffaqiyatli sync bo'lgan kurslar localStorage dan o'chiriladi.
 */
export async function syncLocalProgressToDb(userId: string): Promise<void> {
  const localData = getLocalProgress();
  const courseIds = Object.keys(localData);
  if (courseIds.length === 0) return;

  const successfulSyncs: string[] = [];

  for (const courseId of courseIds) {
    const local = localData[courseId];
    const progressId = `${userId}_${courseId}`;

    try {
      const existing = await getUserProgress(userId, courseId);

      if (existing) {
        // Merge: local va DB dagi progressni birlashtirish (ko'proq qiymat saqlanadi)
        const mergedTopics = [...new Set([...existing.completedTopics, ...local.completedTopics])];
        const mergedProblems = [...new Set([...existing.completedProblems, ...local.completedProblems])];
        const mergedXP = Math.max(existing.totalXP, local.totalXP);

        await updateUserProgress(progressId, {
          completedTopics: mergedTopics,
          completedProblems: mergedProblems,
          totalXP: mergedXP,
          lastAccessedAt: Date.now(),
        });
      } else {
        // Yangi progress yaratish
        const dbProgress: UserProgress = {
          ...local,
          id: progressId,
          userId,
          lastAccessedAt: Date.now(),
        };
        await setUserProgress(dbProgress);
      }
      successfulSyncs.push(courseId);
    } catch (err) {
      console.error(`Progress sync xatolik (${courseId}):`, err);
      // Bu kursning progressi saqlanadi — keyingi safar qayta urinadi
    }
  }

  // Faqat muvaffaqiyatli sync bo'lganlarni o'chirish
  if (successfulSyncs.length === courseIds.length) {
    // Hammasi muvaffaqiyatli — to'liq tozalash
    localStorage.removeItem(STORAGE_KEY);
  } else if (successfulSyncs.length > 0) {
    // Qisman muvaffaqiyatli — faqat sync bo'lganlarni o'chirish
    const remaining = { ...localData };
    for (const id of successfulSyncs) {
      delete remaining[id];
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(remaining));
  }
  // Agar hech biri muvaffaqiyatli bo'lmasa — hech narsa o'chirilmaydi
}

/** Local progress mavjudligini tekshirish */
export function hasLocalProgress(): boolean {
  return Object.keys(getLocalProgress()).length > 0;
}
