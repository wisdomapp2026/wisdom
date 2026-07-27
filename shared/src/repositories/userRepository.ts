import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  writeBatch,
  runTransaction,
  increment,
} from "firebase/firestore";
import { db } from "../firebase";
import type { User, UserProgress, TestResult, Subscription, Payment, UserActivity, ActivitySession, FavoriteTopic } from "../types";

// ============ USERS ============

export async function getUserById(userId: string): Promise<User | null> {
  const snap = await getDoc(doc(db, "users", userId));
  return snap.exists() ? (snap.data() as User) : null;
}

export async function createUser(user: User): Promise<void> {
  await setDoc(doc(db, "users", user.id), user);
}

export async function updateUser(userId: string, data: Partial<User>): Promise<void> {
  const cleanData: Record<string, any> = { updatedAt: Date.now() };
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) cleanData[key] = value;
  }
  await updateDoc(doc(db, "users", userId), cleanData);
}

export async function getAllStudents(): Promise<User[]> {
  const q = query(collection(db, "users"), where("role", "==", "student"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as User);
}

// ============ PROGRESS ============

export async function getUserProgress(userId: string, courseId: string): Promise<UserProgress | null> {
  const id = `${userId}_${courseId}`;
  const snap = await getDoc(doc(db, "progress", id));
  return snap.exists() ? (snap.data() as UserProgress) : null;
}

export async function setUserProgress(progress: UserProgress): Promise<void> {
  await setDoc(doc(db, "progress", progress.id), progress);
}

export async function updateUserProgress(progressId: string, data: Partial<UserProgress>): Promise<void> {
  await updateDoc(doc(db, "progress", progressId), data);
}

export async function getAllProgressByUser(userId: string): Promise<UserProgress[]> {
  const q = query(collection(db, "progress"), where("userId", "==", userId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as UserProgress);
}

export async function getStudentCountByCourse(courseId: string): Promise<number> {
  const q = query(collection(db, "progress"), where("courseId", "==", courseId));
  const snap = await getDocs(q);
  return snap.size;
}

/** Kurs ichidagi barcha o'quvchilar progressini olish (reyting hisoblash uchun) */
export async function getAllProgressByCourse(courseId: string): Promise<UserProgress[]> {
  const q = query(collection(db, "progress"), where("courseId", "==", courseId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as UserProgress);
}

// ============ TEST RESULTS ============

export async function saveTestResult(result: TestResult): Promise<void> {
  await setDoc(doc(db, "testResults", result.id), result);
}

export async function getTestResultsByUser(userId: string): Promise<TestResult[]> {
  const q = query(collection(db, "testResults"), where("userId", "==", userId), orderBy("completedAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as TestResult);
}

/** Barcha test natijalarini olish (reyting uchun) */
export async function getAllTestResults(): Promise<TestResult[]> {
  const snap = await getDocs(collection(db, "testResults"));
  return snap.docs.map((d) => d.data() as TestResult);
}

export async function getTestResultsByTest(testId: string): Promise<TestResult[]> {
  const q = query(collection(db, "testResults"), where("testId", "==", testId), orderBy("completedAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as TestResult);
}

// ============ SUBSCRIPTIONS ============

export async function getUserSubscription(userId: string): Promise<Subscription | null> {
  const q = query(
    collection(db, "subscriptions"),
    where("userId", "==", userId),
    where("status", "==", "active"),
    limit(1)
  );
  const snap = await getDocs(q);
  return snap.empty ? null : (snap.docs[0].data() as Subscription);
}

/** Foydalanuvchining barcha obunalarini olish (faol + bekor qilingan — tarix uchun) */
export async function getAllUserSubscriptions(userId: string): Promise<Subscription[]> {
  const q = query(
    collection(db, "subscriptions"),
    where("userId", "==", userId)
  );
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => d.data() as Subscription)
    .sort((a, b) => (b.startDate || 0) - (a.startDate || 0));
}

export async function createSubscription(sub: Subscription): Promise<void> {
  await setDoc(doc(db, "subscriptions", sub.id), sub);
}

/** Admin tomonidan obunani bekor qilish */
export async function cancelSubscription(subscriptionId: string): Promise<void> {
  await updateDoc(doc(db, "subscriptions", subscriptionId), {
    status: "cancelled",
    cancelledAt: Date.now(),
  });
}

// ============ PAYMENTS ============

export async function createPayment(payment: Payment): Promise<void> {
  await setDoc(doc(db, "payments", payment.id), payment);
}

export async function getRecentPayments(limitCount = 10): Promise<Payment[]> {
  const q = query(collection(db, "payments"), orderBy("createdAt", "desc"), limit(limitCount));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as Payment);
}

export async function getPaymentsByUser(userId: string): Promise<Payment[]> {
  const q = query(collection(db, "payments"), where("userId", "==", userId));
  const snap = await getDocs(q);
  const results = snap.docs.map((d) => d.data() as Payment);
  return results.sort((a, b) => b.createdAt - a.createdAt);
}


// ============ BAN & DELETE ============

export async function banUser(userId: string): Promise<void> {
  await updateDoc(doc(db, "users", userId), { isBanned: true, bannedAt: Date.now(), updatedAt: Date.now() });
}

export async function unbanUser(userId: string): Promise<void> {
  await updateDoc(doc(db, "users", userId), { isBanned: false, bannedAt: null, updatedAt: Date.now() });
}

export async function deleteUserCompletely(userId: string): Promise<void> {
  // Barcha bog'liq ma'lumotlarni to'plash
  const refsToDelete: any[] = [];

  // 1. Progress o'chirish
  const progressQ = query(collection(db, "progress"), where("userId", "==", userId));
  const progressSnap = await getDocs(progressQ);
  progressSnap.docs.forEach((d) => refsToDelete.push(d.ref));

  // 2. Test natijalarini o'chirish
  const resultsQ = query(collection(db, "testResults"), where("userId", "==", userId));
  const resultsSnap = await getDocs(resultsQ);
  resultsSnap.docs.forEach((d) => refsToDelete.push(d.ref));

  // 3. Obunalarni o'chirish
  const subsQ = query(collection(db, "subscriptions"), where("userId", "==", userId));
  const subsSnap = await getDocs(subsQ);
  subsSnap.docs.forEach((d) => refsToDelete.push(d.ref));

  // 4. To'lovlarni o'chirish
  const paymentsQ = query(collection(db, "payments"), where("userId", "==", userId));
  const paymentsSnap = await getDocs(paymentsQ);
  paymentsSnap.docs.forEach((d) => refsToDelete.push(d.ref));

  // 5. Faollik ma'lumotlarini o'chirish
  const activityQ = query(collection(db, "userActivity"), where("userId", "==", userId));
  const activitySnap = await getDocs(activityQ);
  activitySnap.docs.forEach((d) => refsToDelete.push(d.ref));

  // 6. Favoritelarni o'chirish
  const favQ = query(collection(db, "favorites"), where("userId", "==", userId));
  const favSnap = await getDocs(favQ);
  favSnap.docs.forEach((d) => refsToDelete.push(d.ref));

  // 7. User hujjatini o'chirish
  refsToDelete.push(doc(db, "users", userId));

  // WriteBatch bilan atomic o'chirish (limit: 500 per batch)
  const BATCH_SIZE = 450;
  for (let i = 0; i < refsToDelete.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    const chunk = refsToDelete.slice(i, i + BATCH_SIZE);
    chunk.forEach((ref) => batch.delete(ref));
    await batch.commit();
  }
}


// ============ USER ACTIVITY (Faollik) ============

/** Bugungi sana stringini olish */
function getTodayDateStr(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

/** Foydalanuvchi sessiyasini boshlash (kirganida) */
export async function startUserSession(userId: string, userName: string): Promise<void> {
  const dateStr = getTodayDateStr();
  const id = `${userId}_${dateStr}`;
  const ref = doc(db, "userActivity", id);
  const snap = await getDoc(ref);

  const session: ActivitySession = {
    startedAt: Date.now(),
    durationMinutes: 0,
  };

  if (snap.exists()) {
    const data = snap.data() as UserActivity;
    await updateDoc(ref, {
      sessions: [...data.sessions, session],
      lastActiveAt: Date.now(),
    });
  } else {
    const activity: UserActivity = {
      id,
      userId,
      userName,
      date: dateStr,
      totalMinutes: 0,
      sessions: [session],
      lastActiveAt: Date.now(),
    };
    await setDoc(ref, activity);
  }
}

/** Sessiya vaqtini yangilash (har 30 soniyada chaqiriladi) — transaction bilan race condition oldini olish */
export async function updateSessionTime(userId: string): Promise<void> {
  const dateStr = getTodayDateStr();
  const id = `${userId}_${dateStr}`;
  const ref = doc(db, "userActivity", id);

  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(ref);
    if (!snap.exists()) return;

    const data = snap.data() as UserActivity;
    if (data.sessions.length === 0) return;

    const sessions = [...data.sessions];
    const lastSession = { ...sessions[sessions.length - 1] };
    const elapsed = (Date.now() - lastSession.startedAt) / 60000;
    lastSession.durationMinutes = Math.round(elapsed);
    sessions[sessions.length - 1] = lastSession;

    const totalMinutes = sessions.reduce((sum, s) => sum + s.durationMinutes, 0);

    transaction.update(ref, {
      sessions,
      totalMinutes,
      lastActiveAt: Date.now(),
    });
  });
}

/** Sessiyani tugatish */
export async function endUserSession(userId: string): Promise<void> {
  const dateStr = getTodayDateStr();
  const id = `${userId}_${dateStr}`;
  const ref = doc(db, "userActivity", id);
  const snap = await getDoc(ref);

  if (!snap.exists()) return;

  const data = snap.data() as UserActivity;
  if (data.sessions.length === 0) return;

  const sessions = [...data.sessions];
  const lastSession = { ...sessions[sessions.length - 1] };
  lastSession.endedAt = Date.now();
  lastSession.durationMinutes = Math.round((Date.now() - lastSession.startedAt) / 60000);
  sessions[sessions.length - 1] = lastSession;

  const totalMinutes = sessions.reduce((sum, s) => sum + s.durationMinutes, 0);

  await updateDoc(ref, {
    sessions,
    totalMinutes,
    lastActiveAt: Date.now(),
  });
}

/** Barcha o'quvchilarning faolligini olish (admin uchun, oxirgi N kun) */
export async function getAllStudentActivities(daysBack = 7): Promise<UserActivity[]> {
  // Firestore "in" query 30 ta qiymatgacha qo'llab-quvvatlaydi
  // 30 dan ko'p bo'lsa, chunklarga bo'lamiz
  const MAX_IN_VALUES = 30;
  const safeDaysBack = Math.max(1, daysBack);

  const now = new Date();
  const dates: string[] = [];
  for (let i = 0; i < safeDaysBack; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    dates.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
  }

  const allActivities: UserActivity[] = [];

  // Chunklarga bo'lib so'rov yuborish
  for (let i = 0; i < dates.length; i += MAX_IN_VALUES) {
    const chunk = dates.slice(i, i + MAX_IN_VALUES);
    const q = query(
      collection(db, "userActivity"),
      where("date", "in", chunk),
      orderBy("lastActiveAt", "desc")
    );
    const snap = await getDocs(q);
    snap.docs.forEach((d) => allActivities.push(d.data() as UserActivity));
  }

  // Oxirgi faollik bo'yicha tartiblash
  return allActivities.sort((a, b) => (b.lastActiveAt || 0) - (a.lastActiveAt || 0));
}

/** Bugungi faol o'quvchilar ro'yxati */
export async function getTodayActiveStudents(): Promise<UserActivity[]> {
  const dateStr = getTodayDateStr();
  const q = query(
    collection(db, "userActivity"),
    where("date", "==", dateStr),
    orderBy("lastActiveAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as UserActivity);
}


// ============ FAVORITE TOPICS (Tanlangan mavzular) ============

/** Mavzuni tanlanganlarga qo'shish */
export async function addFavoriteTopic(fav: FavoriteTopic): Promise<void> {
  await setDoc(doc(db, "favorites", fav.id), fav);
}

/** Mavzuni tanlanganlardan o'chirish */
export async function removeFavoriteTopic(favId: string): Promise<void> {
  await deleteDoc(doc(db, "favorites", favId));
}

/** Foydalanuvchining barcha tanlangan mavzulari */
export async function getFavoriteTopics(userId: string): Promise<FavoriteTopic[]> {
  const q = query(collection(db, "favorites"), where("userId", "==", userId));
  const snap = await getDocs(q);
  const results = snap.docs.map((d) => d.data() as FavoriteTopic);
  return results.sort((a, b) => b.createdAt - a.createdAt);
}

/** Bitta mavzu tanlanganmi yoki yo'qligini tekshirish */
export async function isFavoriteTopic(userId: string, topicId: string): Promise<boolean> {
  const snap = await getDoc(doc(db, "favorites", `${userId}_${topicId}`));
  return snap.exists();
}

// ============ CERTIFICATES (Sertifikatlar) ============

import type { Certificate } from "../types";

const CERTIFICATES_COL = "certificates";

export async function getCertificatesByUser(userId: string): Promise<Certificate[]> {
  const q = query(collection(db, CERTIFICATES_COL), where("userId", "==", userId));
  const snap = await getDocs(q);
  const results = snap.docs.map((d) => d.data() as Certificate);
  return results.sort((a, b) => b.issuedAt - a.issuedAt);
}

export async function getCertificate(userId: string, courseId: string): Promise<Certificate | null> {
  const id = `cert-${userId}-${courseId}`;
  const snap = await getDoc(doc(db, CERTIFICATES_COL, id));
  return snap.exists() ? (snap.data() as Certificate) : null;
}

export async function createCertificate(cert: Certificate): Promise<void> {
  await setDoc(doc(db, CERTIFICATES_COL, cert.id), cert);
}

export async function getAllCertificates(): Promise<Certificate[]> {
  const snap = await getDocs(collection(db, CERTIFICATES_COL));
  const results = snap.docs.map((d) => d.data() as Certificate);
  return results.sort((a, b) => b.issuedAt - a.issuedAt);
}
