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
import type { Course, Topic, Problem, Test, Advice } from "../types";

const COURSES_COL = "courses";

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
  await setDoc(doc(db, COURSES_COL, course.id), course);
}

export async function updateCourse(courseId: string, data: Partial<Course>): Promise<void> {
  await updateDoc(doc(db, COURSES_COL, courseId), { ...data, updatedAt: Date.now() });
}

export async function deleteCourse(courseId: string): Promise<void> {
  await deleteDoc(doc(db, COURSES_COL, courseId));
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
  await setDoc(doc(db, COURSES_COL, courseId, "topics", topic.id), topic);
}

export async function updateTopic(courseId: string, topicId: string, data: Partial<Topic>): Promise<void> {
  await updateDoc(doc(db, COURSES_COL, courseId, "topics", topicId), { ...data, updatedAt: Date.now() });
}

export async function deleteTopic(courseId: string, topicId: string): Promise<void> {
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
    problem
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
    data
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
  await setDoc(doc(db, COURSES_COL, courseId, "tests", test.id), test);
}

export async function updateTest(courseId: string, testId: string, data: Partial<Test>): Promise<void> {
  await updateDoc(doc(db, COURSES_COL, courseId, "tests", testId), { ...data, updatedAt: Date.now() });
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
  await setDoc(doc(db, TEST_LIBRARY_COL, test.id), test);
}

export async function updateLibraryTest(testId: string, data: Partial<Test>): Promise<void> {
  await updateDoc(doc(db, TEST_LIBRARY_COL, testId), { ...data, updatedAt: Date.now() });
}

export async function deleteLibraryTest(testId: string): Promise<void> {
  await deleteDoc(doc(db, TEST_LIBRARY_COL, testId));
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
  await updateDoc(doc(db, COURSES_COL, courseId, "advices", adviceId), { ...data, updatedAt: Date.now() });
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
