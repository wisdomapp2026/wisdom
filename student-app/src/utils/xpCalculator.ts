import type { UserProgress } from "@shared/types";

/**
 * Foydalanuvchining umumiy XP ballini hisoblash:
 * - Har bir bajarilgan mavzu (Topic) uchun: 10 XP
 * - Har bir yechilgan misol (Problem) uchun: 5 XP
 * - Har bir to'g'ri ishlangan test savoli (Test Question) uchun: 10 XP (10 ta savol = 100 XP)
 */
export function calculateUserXP(progress: Partial<UserProgress> | null | undefined): number {
  if (!progress) return 0;

  const topicCount = progress.completedTopics?.length || 0;
  const problemCount = progress.completedProblems?.length || 0;

  // Mavzular va misollardan to'plangan ball
  const topicXP = topicCount * 10;
  const problemXP = problemCount * 5;

  // Test natijalaridan to'plangan ball (har bir to'g'ri javob uchun 10 XP)
  let testXP = progress.testXP || 0;
  if (!testXP && progress.testResults) {
    for (const res of Object.values(progress.testResults as Record<string, any>)) {
      if (res && typeof res.score === "number") {
        testXP += res.score * 10; // score = to'g'ri javoblar soni
      } else if (res && typeof res.earnedPoints === "number") {
        testXP += res.earnedPoints;
      }
    }
  }

  const calculatedTotal = topicXP + problemXP + testXP;

  // Saqlangan totalXP bilan solishtirib, kattasini qaytarish
  return Math.max(progress.totalXP || 0, calculatedTotal);
}
