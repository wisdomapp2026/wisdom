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
  query,
  orderBy,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "../firebase";
import type { Course, Topic, Problem, Test } from "../types";

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
