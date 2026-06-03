import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
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

// ============ TEST RESULTS ============

export async function saveTestResult(result: TestResult): Promise<void> {
  await setDoc(doc(db, "testResults", result.id), result);
}

export async function getTestResultsByUser(userId: string): Promise<TestResult[]> {
  const q = query(collection(db, "testResults"), where("userId", "==", userId), orderBy("completedAt", "desc"));
  const snap = await getDocs(q);
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
