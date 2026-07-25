import { getCertificate, createCertificate, getUserProgress, getTopicsByCourse, getCourseById } from "@shared/repositories";
import type { Certificate } from "@shared/types";

/**
 * Kurs progressi 85%+ bo'lganda avtomatik sertifikat yaratish.
 * Agar sertifikat allaqachon mavjud bo'lsa — qayta yaratmaydi.
 */
export async function checkAndIssueCertificate(userId: string, userName: string, courseId: string): Promise<Certificate | null> {
  try {
    // Avval sertifikat borligini tekshirish
    const existing = await getCertificate(userId, courseId);
    if (existing) return existing;

    // Progress ni tekshirish
    const progress = await getUserProgress(userId, courseId);
    if (!progress) return null;

    // Kurs mavzulari sonini olish
    const topics = await getTopicsByCourse(courseId);
    if (topics.length === 0) return null;

    // Foizni hisoblash
    const completionPercent = Math.round((progress.completedTopics.length / topics.length) * 100);
    if (completionPercent < 85) return null;

    // Kurs nomini olish
    const course = await getCourseById(courseId);
    if (!course) return null;

    // Unikal verification code generatsiya qilish
    const verificationCode = generateVerificationCode(userId, courseId);

    // Sertifikat yaratish
    const cert: Certificate = {
      id: `cert-${userId}-${courseId}`,
      userId,
      userName,
      courseId,
      courseTitle: course.title,
      completionPercent,
      issuedAt: Date.now(),
      verificationCode,
    };

    await createCertificate(cert);
    return cert;
  } catch (err) {
    console.error("Sertifikat tekshirishda xatolik:", err);
    return null;
  }
}

/** Unikal tekshiruv kodi generatsiya qilish */
function generateVerificationCode(userId: string, courseId: string): string {
  const base = `${userId.slice(0, 4)}-${courseId.slice(0, 4)}-${Date.now().toString(36)}`;
  return `EDU-${base.toUpperCase().slice(0, 12)}`;
}
