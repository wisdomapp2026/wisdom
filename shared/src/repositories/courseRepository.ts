/**
 * Course Repository — Firestore bilan ishlash uchun abstraction layer
 * Kelajakda bazani almashtirish oson bo'lishi uchun barcha DB chaqiruvlar shu yerda
 */
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  deleteField,
  query,
  orderBy,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "../firebase";
import type { Course, Topic, Problem, Test, Advice, Folder } from "../types";

const COURSES_COL = "courses";

/**
 * Firestore updateDoc undefined qiymatni qabul qilmaydi.
 * undefined maydonlarni deleteField() ga aylantiramiz (maydonni o'chiradi).
 */
function cleanUpdate(data: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    result[key] = value === undefined ? deleteField() : value;
  }
  return result;
}

/**
 * setDoc uchun — undefined maydonlarni to'liq olib tashlaydi (deleteField ishlamaydi setDoc da).
 * Rekursiv — ichki obektlar va arraylar ham tozalanadi.
 */
function cleanData(data: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      result[key] = value.map((item) =>
        item && typeof item === "object" && !Array.isArray(item) ? cleanData(item) : item
      );
    } else if (value && typeof value === "object" && !(value instanceof Date)) {
      result[key] = cleanData(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

// ============ COURSES ============

export async function getAllCourses(): Promise<Course[]> {
  const q = query(collection(db, COURSES_COL), orderBy("order", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as Course);
}

export async function getCourseById(courseId: string): Promise<Course | null> {
  const snap = await getDoc(doc(db, COURSES_COL, courseId));
  return snap.exists() ? (snap.data() as Course) : null;
}

export async function createCourse(course: Course): Promise<void> {
  await setDoc(doc(db, COURSES_COL, course.id), cleanData(course as any));
}

export async function updateCourse(courseId: string, data: Partial<Course>): Promise<void> {
  await updateDoc(doc(db, COURSES_COL, courseId), { ...data, updatedAt: Date.now() });
}

export async function deleteCourse(courseId: string): Promise<void> {
  // Barcha o'chiriladigan doc ref larni to'plash
  const refsToDelete: any[] = [];

  // Papkalar va ularning presence lari
  const foldersSnap = await getDocs(collection(db, COURSES_COL, courseId, "folders"));
  for (const f of foldersSnap.docs) {
    const presSnap = await getDocs(collection(f.ref, "presence"));
    presSnap.docs.forEach((p) => refsToDelete.push(p.ref));
    refsToDelete.push(f.ref);
  }
  // Mavzular va ularning misollari
  const topicsSnap = await getDocs(collection(db, COURSES_COL, courseId, "topics"));
  for (const t of topicsSnap.docs) {
    const probsSnap = await getDocs(collection(t.ref, "problems"));
    probsSnap.docs.forEach((p) => refsToDelete.push(p.ref));
    refsToDelete.push(t.ref);
  }
  // Testlar
  const testsSnap = await getDocs(collection(db, COURSES_COL, courseId, "tests"));
  testsSnap.docs.forEach((t) => refsToDelete.push(t.ref));
  // Maslahatlar
  const advSnap = await getDocs(collection(db, COURSES_COL, courseId, "advices"));
  advSnap.docs.forEach((a) => refsToDelete.push(a.ref));
  // Ijtimoiy tarmoqlar
  const socialSnap = await getDocs(collection(db, COURSES_COL, courseId, "socialLinks"));
  socialSnap.docs.forEach((s) => refsToDelete.push(s.ref));
  // Kursning o'zi
  refsToDelete.push(doc(db, COURSES_COL, courseId));

  // Batch bilan o'chirish (Firestore limit: 500 per batch)
  const BATCH_SIZE = 450;
  for (let i = 0; i < refsToDelete.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    const chunk = refsToDelete.slice(i, i + BATCH_SIZE);
    chunk.forEach((ref) => batch.delete(ref));
    await batch.commit();
  }
}

// ============ FOLDERS (Papkalar / Kitoblar) ============

export async function getFoldersByCourse(courseId: string): Promise<Folder[]> {
  const q = query(
    collection(db, COURSES_COL, courseId, "folders"),
    orderBy("order", "asc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as Folder);
}

export async function getFolderById(courseId: string, folderId: string): Promise<Folder | null> {
  const snap = await getDoc(doc(db, COURSES_COL, courseId, "folders", folderId));
  return snap.exists() ? (snap.data() as Folder) : null;
}

export async function createFolder(courseId: string, folder: Folder): Promise<void> {
  await setDoc(doc(db, COURSES_COL, courseId, "folders", folder.id), cleanData(folder as any));
}

export async function updateFolder(courseId: string, folderId: string, data: Partial<Folder>): Promise<void> {
  await updateDoc(doc(db, COURSES_COL, courseId, "folders", folderId), cleanUpdate({ ...data, updatedAt: Date.now() }));
}

/**
 * Papkani o'chirish. Ichidagi barcha mavzu, test va maslahatlarni ham DB dan o'chiradi.
 * Mavzu o'chirilganda uning ichidagi misollar (problems) ham o'chiriladi.
 * writeBatch bilan atomic o'chirish.
 */
export async function deleteFolder(courseId: string, folderId: string): Promise<void> {
  const refsToDelete: any[] = [];

  // Papka ichidagi mavzularni o'chirish (har bir mavzuning problems lari bilan)
  const topicsSnap = await getDocs(query(collection(db, COURSES_COL, courseId, "topics"), where("folderId", "==", folderId)));
  for (const d of topicsSnap.docs) {
    const problemsSnap = await getDocs(collection(db, COURSES_COL, courseId, "topics", d.id, "problems"));
    problemsSnap.docs.forEach((p) => refsToDelete.push(p.ref));
    refsToDelete.push(d.ref);
  }
  // Papka ichidagi testlarni o'chirish
  const testsSnap = await getDocs(query(collection(db, COURSES_COL, courseId, "tests"), where("folderId", "==", folderId)));
  testsSnap.docs.forEach((d) => refsToDelete.push(d.ref));
  // Papka ichidagi maslahatlarni o'chirish
  const advSnap = await getDocs(query(collection(db, COURSES_COL, courseId, "advices"), where("folderId", "==", folderId)));
  advSnap.docs.forEach((d) => refsToDelete.push(d.ref));
  // Papka presence ni tozalash
  const presenceSnap = await getDocs(collection(db, COURSES_COL, courseId, "folders", folderId, "presence"));
  presenceSnap.docs.forEach((d) => refsToDelete.push(d.ref));
  // Papkani o'zi
  refsToDelete.push(doc(db, COURSES_COL, courseId, "folders", folderId));

  // Batch bilan atomic o'chirish
  const BATCH_SIZE = 450;
  for (let i = 0; i < refsToDelete.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    const chunk = refsToDelete.slice(i, i + BATCH_SIZE);
    chunk.forEach((ref) => batch.delete(ref));
    await batch.commit();
  }
}

// ============ FOLDER PRESENCE (Papkani o'qiyotgan onlayn userlar) ============

/**
 * Foydalanuvchi papkani ochganda "men shu yerdaman" deb belgilaydi.
 * Har ~30 soniyada qayta chaqirilishi kerak (heartbeat).
 */
export async function markFolderPresence(courseId: string, folderId: string, userId: string): Promise<void> {
  await setDoc(doc(db, COURSES_COL, courseId, "folders", folderId, "presence", userId), {
    userId,
    lastSeen: Date.now(),
  });
}

/** Foydalanuvchi papkadan chiqqanda presence ni o'chirish */
export async function clearFolderPresence(courseId: string, folderId: string, userId: string): Promise<void> {
  await deleteDoc(doc(db, COURSES_COL, courseId, "folders", folderId, "presence", userId));
}

/** Papkani hozir o'qiyotgan onlayn userlar soni (oxirgi 60 soniyada faol) */
export async function getFolderOnlineCount(courseId: string, folderId: string): Promise<number> {
  const snap = await getDocs(collection(db, COURSES_COL, courseId, "folders", folderId, "presence"));
  const cutoff = Date.now() - 60000; // 60 soniya
  return snap.docs.filter((d) => {
    const data = d.data() as { lastSeen?: number };
    return (data.lastSeen || 0) >= cutoff;
  }).length;
}

// ============ TOPICS ============
export async function getTopicsByCourse(courseId: string): Promise<Topic[]> {
  const q = query(
    collection(db, COURSES_COL, courseId, "topics"),
    orderBy("order", "asc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as Topic);
}

export async function getTopicById(courseId: string, topicId: string): Promise<Topic | null> {
  const snap = await getDoc(doc(db, COURSES_COL, courseId, "topics", topicId));
  return snap.exists() ? (snap.data() as Topic) : null;
}

export async function createTopic(courseId: string, topic: Topic): Promise<void> {
  await setDoc(doc(db, COURSES_COL, courseId, "topics", topic.id), cleanData(topic as any));
}

export async function updateTopic(courseId: string, topicId: string, data: Partial<Topic>): Promise<void> {
  await updateDoc(doc(db, COURSES_COL, courseId, "topics", topicId), cleanUpdate({ ...data, updatedAt: Date.now() }));
}

export async function deleteTopic(courseId: string, topicId: string): Promise<void> {
  // Mavzu ichidagi barcha misollarni (problems) o'chirish
  const problemsSnap = await getDocs(collection(db, COURSES_COL, courseId, "topics", topicId, "problems"));
  for (const d of problemsSnap.docs) {
    await deleteDoc(d.ref);
  }
  await deleteDoc(doc(db, COURSES_COL, courseId, "topics", topicId));
}

// ============ PROBLEMS ============

export async function getProblemsByTopic(courseId: string, topicId: string): Promise<Problem[]> {
  const q = query(
    collection(db, COURSES_COL, courseId, "topics", topicId, "problems"),
    orderBy("order", "asc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as Problem);
}

export async function createProblem(courseId: string, topicId: string, problem: Problem): Promise<void> {
  await setDoc(
    doc(db, COURSES_COL, courseId, "topics", topicId, "problems", problem.id),
    cleanData(problem as any)
  );
}

export async function updateProblem(
  courseId: string,
  topicId: string,
  problemId: string,
  data: Partial<Problem>
): Promise<void> {
  await updateDoc(
    doc(db, COURSES_COL, courseId, "topics", topicId, "problems", problemId),
    cleanUpdate(data as any)
  );
}

export async function deleteProblem(courseId: string, topicId: string, problemId: string): Promise<void> {
  await deleteDoc(doc(db, COURSES_COL, courseId, "topics", topicId, "problems", problemId));
}

// ============ TESTS ============

export async function getTestsByCourse(courseId: string): Promise<Test[]> {
  const q = query(collection(db, COURSES_COL, courseId, "tests"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as Test);
}

export async function getTestById(courseId: string, testId: string): Promise<Test | null> {
  const snap = await getDoc(doc(db, COURSES_COL, courseId, "tests", testId));
  return snap.exists() ? (snap.data() as Test) : null;
}

export async function createTest(courseId: string, test: Test): Promise<void> {
  await setDoc(doc(db, COURSES_COL, courseId, "tests", test.id), cleanData(test as any));
}

export async function updateTest(courseId: string, testId: string, data: Partial<Test>): Promise<void> {
  await updateDoc(doc(db, COURSES_COL, courseId, "tests", testId), cleanUpdate({ ...data, updatedAt: Date.now() }));
}

export async function deleteTest(courseId: string, testId: string): Promise<void> {
  await deleteDoc(doc(db, COURSES_COL, courseId, "tests", testId));
}

// ============ TEST LIBRARY (Umumiy test banki — root "testLibrary" collection) ============

const TEST_LIBRARY_COL = "testLibrary";

export async function getAllLibraryTests(): Promise<Test[]> {
  const q = query(collection(db, TEST_LIBRARY_COL), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as Test);
}

export async function saveTestToLibrary(test: Test): Promise<void> {
  await setDoc(doc(db, TEST_LIBRARY_COL, test.id), cleanData(test as any));
}

export async function updateLibraryTest(testId: string, data: Partial<Test>): Promise<void> {
  await updateDoc(doc(db, TEST_LIBRARY_COL, testId), { ...data, updatedAt: Date.now() });
}

export async function deleteLibraryTest(testId: string): Promise<void> {
  await deleteDoc(doc(db, TEST_LIBRARY_COL, testId));
}

// ============ TEST BUILDER (Savol bazasi — barcha adminlar uchun umumiy) ============

const TB_QUESTIONS_COL = "testBuilderQuestions";
const TB_FOLDERS_COL = "testBuilderFolders";

export async function getAllTBQuestions(): Promise<any[]> {
  const snap = await getDocs(query(collection(db, TB_QUESTIONS_COL), orderBy("order", "desc")));
  return snap.docs.map((d) => d.data());
}

export async function saveTBQuestion(question: any): Promise<void> {
  await setDoc(doc(db, TB_QUESTIONS_COL, question.id), cleanData(question));
}

export async function deleteTBQuestion(questionId: string): Promise<void> {
  await deleteDoc(doc(db, TB_QUESTIONS_COL, questionId));
}

export async function getAllTBFolders(): Promise<any[]> {
  const snap = await getDocs(collection(db, TB_FOLDERS_COL));
  return snap.docs.map((d) => d.data());
}

export async function saveTBFolder(folder: any): Promise<void> {
  await setDoc(doc(db, TB_FOLDERS_COL, folder.id), cleanData(folder));
}

export async function deleteTBFolder(folderId: string): Promise<void> {
  await deleteDoc(doc(db, TB_FOLDERS_COL, folderId));
}

// ============ ADVICE (Maslahat bloklari) ============

export async function getAdviceByCourse(courseId: string): Promise<Advice[]> {
  const snap = await getDocs(collection(db, COURSES_COL, courseId, "advices"));
  const results = snap.docs.map((d) => d.data() as Advice);
  return results.sort((a, b) => (a.afterTopicOrder || 0) - (b.afterTopicOrder || 0));
}

export async function createAdvice(courseId: string, advice: Advice): Promise<void> {
  await setDoc(doc(db, COURSES_COL, courseId, "advices", advice.id), advice);
}

export async function updateAdvice(courseId: string, adviceId: string, data: Partial<Advice>): Promise<void> {
  await updateDoc(doc(db, COURSES_COL, courseId, "advices", adviceId), cleanUpdate({ ...data, updatedAt: Date.now() }));
}

export async function deleteAdvice(courseId: string, adviceId: string): Promise<void> {
  await deleteDoc(doc(db, COURSES_COL, courseId, "advices", adviceId));
}

// ============ MOTIVATIONAL PHRASES (Motivatsion frazalar) ============

import type { MotivationalPhrase, MotivationSettings, MotivationPlacement } from "../types";

const MOTIVATION_COL = "motivations";
const MOTIVATION_SETTINGS_COL = "motivationSettings";

/** Barcha frazalarni olish (placement bo'yicha) */
export async function getMotivationPhrases(placement: MotivationPlacement): Promise<MotivationalPhrase[]> {
  const q = query(
    collection(db, MOTIVATION_COL),
    where("placement", "==", placement)
  );
  const snap = await getDocs(q);
  const results = snap.docs.map((d) => d.data() as MotivationalPhrase);
  return results.sort((a, b) => (a.order || 0) - (b.order || 0));
}

/** Yangi fraza yaratish */
export async function createMotivationPhrase(phrase: MotivationalPhrase): Promise<void> {
  await setDoc(doc(db, MOTIVATION_COL, phrase.id), phrase);
}

/** Frazani yangilash */
export async function updateMotivationPhrase(phraseId: string, data: Partial<MotivationalPhrase>): Promise<void> {
  await updateDoc(doc(db, MOTIVATION_COL, phraseId), data);
}

/** Frazani o'chirish */
export async function deleteMotivationPhrase(phraseId: string): Promise<void> {
  await deleteDoc(doc(db, MOTIVATION_COL, phraseId));
}

/** Sozlamalarni olish */
export async function getMotivationSettings(placement: MotivationPlacement): Promise<MotivationSettings | null> {
  const snap = await getDoc(doc(db, MOTIVATION_SETTINGS_COL, placement));
  return snap.exists() ? (snap.data() as MotivationSettings) : null;
}

/** Sozlamalarni saqlash */
export async function saveMotivationSettings(settings: MotivationSettings): Promise<void> {
  await setDoc(doc(db, MOTIVATION_SETTINGS_COL, settings.id), settings);
}

// ============ SOCIAL LINKS (Ijtimoiy tarmoqlar) ============

import type { SocialLink } from "../types";

const SOCIAL_LINKS_COL = "socialLinks";

export async function getAllSocialLinks(): Promise<SocialLink[]> {
  const snap = await getDocs(collection(db, SOCIAL_LINKS_COL));
  const results = snap.docs.map((d) => d.data() as SocialLink);
  return results.sort((a, b) => (a.order || 0) - (b.order || 0));
}

export async function getActiveSocialLinks(): Promise<SocialLink[]> {
  const snap = await getDocs(collection(db, SOCIAL_LINKS_COL));
  const results = snap.docs.map((d) => d.data() as SocialLink);
  return results.filter((l) => l.isActive).sort((a, b) => (a.order || 0) - (b.order || 0));
}

export async function createSocialLink(link: SocialLink): Promise<void> {
  await setDoc(doc(db, SOCIAL_LINKS_COL, link.id), link);
}

export async function updateSocialLink(linkId: string, data: Partial<SocialLink>): Promise<void> {
  await updateDoc(doc(db, SOCIAL_LINKS_COL, linkId), { ...data, updatedAt: Date.now() });
}

export async function deleteSocialLink(linkId: string): Promise<void> {
  await deleteDoc(doc(db, SOCIAL_LINKS_COL, linkId));
}

// ============ COURSE SOCIAL LINKS (Kurs ichidagi ijtimoiy tarmoqlar) ============

export async function getCourseSocialLinks(courseId: string): Promise<SocialLink[]> {
  const snap = await getDocs(collection(db, "courses", courseId, "socialLinks"));
  const results = snap.docs.map((d) => d.data() as SocialLink);
  return results.sort((a, b) => (a.order || 0) - (b.order || 0));
}

export async function getActiveCourseLinks(courseId: string): Promise<SocialLink[]> {
  const snap = await getDocs(collection(db, "courses", courseId, "socialLinks"));
  const results = snap.docs.map((d) => d.data() as SocialLink);
  return results.filter((l) => l.isActive).sort((a, b) => (a.order || 0) - (b.order || 0));
}

export async function createCourseSocialLink(courseId: string, link: SocialLink): Promise<void> {
  await setDoc(doc(db, "courses", courseId, "socialLinks", link.id), link);
}

export async function updateCourseSocialLink(courseId: string, linkId: string, data: Partial<SocialLink>): Promise<void> {
  await updateDoc(doc(db, "courses", courseId, "socialLinks", linkId), { ...data, updatedAt: Date.now() });
}

export async function deleteCourseSocialLink(courseId: string, linkId: string): Promise<void> {
  await deleteDoc(doc(db, "courses", courseId, "socialLinks", linkId));
}

// ============ PROMO CODES ============

import type { PromoCode } from "../types";

const PROMO_COL = "promoCodes";

export async function getAllPromoCodes(): Promise<PromoCode[]> {
  const snap = await getDocs(collection(db, PROMO_COL));
  return snap.docs.map((d) => d.data() as PromoCode);
}

export async function getPromoByCode(code: string): Promise<PromoCode | null> {
  const q = query(collection(db, PROMO_COL), where("code", "==", code.toUpperCase()));
  const snap = await getDocs(q);
  return snap.empty ? null : (snap.docs[0].data() as PromoCode);
}

export async function createPromoCode(promo: PromoCode): Promise<void> {
  await setDoc(doc(db, PROMO_COL, promo.id), promo);
}

export async function updatePromoCode(promoId: string, data: Partial<PromoCode>): Promise<void> {
  await updateDoc(doc(db, PROMO_COL, promoId), data);
}

export async function deletePromoCode(promoId: string): Promise<void> {
  await deleteDoc(doc(db, PROMO_COL, promoId));
}

// ============ ADMIN NOTIFICATIONS ============

import type { AdminNotification } from "../types";

const NOTIFICATIONS_COL = "adminNotifications";

export async function getAdminNotifications(): Promise<AdminNotification[]> {
  const snap = await getDocs(collection(db, NOTIFICATIONS_COL));
  const results = snap.docs.map((d) => d.data() as AdminNotification);
  return results.sort((a, b) => b.createdAt - a.createdAt);
}

export async function getUnreadNotificationCount(): Promise<number> {
  const snap = await getDocs(collection(db, NOTIFICATIONS_COL));
  return snap.docs.filter((d) => !(d.data() as AdminNotification).isRead).length;
}

export async function createAdminNotification(notif: AdminNotification): Promise<void> {
  await setDoc(doc(db, NOTIFICATIONS_COL, notif.id), notif);
}

export async function markNotificationRead(notifId: string): Promise<void> {
  await updateDoc(doc(db, NOTIFICATIONS_COL, notifId), { isRead: true });
}

export async function markAllNotificationsRead(): Promise<void> {
  const snap = await getDocs(collection(db, NOTIFICATIONS_COL));
  for (const d of snap.docs) {
    if (!(d.data() as AdminNotification).isRead) {
      await updateDoc(doc(db, NOTIFICATIONS_COL, d.id), { isRead: true });
    }
  }
}


// ============ HOME BANNERS ============

import type { HomeBanner } from "../types";

const BANNERS_COL = "homeBanners";

export async function getAllBanners(): Promise<HomeBanner[]> {
  const snap = await getDocs(collection(db, BANNERS_COL));
  const results = snap.docs.map((d) => d.data() as HomeBanner);
  return results.sort((a, b) => (a.order || 0) - (b.order || 0));
}

export async function getActiveBanners(): Promise<HomeBanner[]> {
  const snap = await getDocs(collection(db, BANNERS_COL));
  const results = snap.docs.map((d) => d.data() as HomeBanner);
  return results.filter((b) => b.isActive).sort((a, b) => (a.order || 0) - (b.order || 0));
}

export async function createBanner(banner: HomeBanner): Promise<void> {
  await setDoc(doc(db, BANNERS_COL, banner.id), cleanData(banner as any));
}

export async function updateBanner(bannerId: string, data: Partial<HomeBanner>): Promise<void> {
  await updateDoc(doc(db, BANNERS_COL, bannerId), cleanUpdate({ ...data, updatedAt: Date.now() }));
}

export async function deleteBanner(bannerId: string): Promise<void> {
  await deleteDoc(doc(db, BANNERS_COL, bannerId));
}


// ============ NEWS ITEMS (Yangiliklar) ============

import type { NewsItem } from "../types";

const NEWS_COL = "newsItems";

export async function getAllNewsItems(): Promise<NewsItem[]> {
  const snap = await getDocs(collection(db, NEWS_COL));
  const results = snap.docs.map((d) => d.data() as NewsItem);
  return results.sort((a, b) => (a.order || 0) - (b.order || 0));
}

export async function getActiveNewsItems(): Promise<NewsItem[]> {
  const snap = await getDocs(collection(db, NEWS_COL));
  const results = snap.docs.map((d) => d.data() as NewsItem);
  return results.filter((n) => n.isActive).sort((a, b) => (a.order || 0) - (b.order || 0));
}

export async function createNewsItem(item: NewsItem): Promise<void> {
  await setDoc(doc(db, NEWS_COL, item.id), cleanData(item as any));
}

export async function updateNewsItem(itemId: string, data: Partial<NewsItem>): Promise<void> {
  await updateDoc(doc(db, NEWS_COL, itemId), cleanUpdate({ ...data, updatedAt: Date.now() }));
}

export async function deleteNewsItem(itemId: string): Promise<void> {
  await deleteDoc(doc(db, NEWS_COL, itemId));
}
