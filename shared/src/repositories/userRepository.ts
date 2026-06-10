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
} from "firebase/firestore";
import { db } from "../firebase";
import type { User, UserProgress, TestResult, Subscription, Payment } from "../types";

// ============ USERS ============

export async function getUserById(userId: string): Promise<User | null> {
  const snap = await getDoc(doc(db, "users", userId));
  return snap.exists() ? (snap.data() as User) : null;
}

export async function createUser(user: User): Promise<void> {
  await setDoc(doc(db, "users", user.id), user);
}

export async function updateUser(userId: string, data: Partial<User>): Promise<void> {
  await updateDoc(doc(db, "users", userId), { ...data, updatedAt: Date.now() });
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

export async function createSubscription(sub: Subscription): Promise<void> {
  await setDoc(doc(db, "subscriptions", sub.id), sub);
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
  // 1. Progress o'chirish
  const progressQ = query(collection(db, "progress"), where("userId", "==", userId));
  const progressSnap = await getDocs(progressQ);
  for (const d of progressSnap.docs) {
    await deleteDoc(doc(db, "progress", d.id));
  }

  // 2. Test natijalarini o'chirish
  const resultsQ = query(collection(db, "testResults"), where("userId", "==", userId));
  const resultsSnap = await getDocs(resultsQ);
  for (const d of resultsSnap.docs) {
    await deleteDoc(doc(db, "testResults", d.id));
  }

  // 3. Obunalarni o'chirish
  const subsQ = query(collection(db, "subscriptions"), where("userId", "==", userId));
  const subsSnap = await getDocs(subsQ);
  for (const d of subsSnap.docs) {
    await deleteDoc(doc(db, "subscriptions", d.id));
  }

  // 4. To'lovlarni o'chirish
  const paymentsQ = query(collection(db, "payments"), where("userId", "==", userId));
  const paymentsSnap = await getDocs(paymentsQ);
  for (const d of paymentsSnap.docs) {
    await deleteDoc(doc(db, "payments", d.id));
  }

  // 5. User hujjatini o'chirish
  await deleteDoc(doc(db, "users", userId));
}
