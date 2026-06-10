/**
 * TestList Repository — Test ro'yxatlari uchun Firestore CRUD
 */
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where,
} from "firebase/firestore";
import { db } from "../firebase";
import type { TestList } from "../types";

const TEST_LISTS_COL = "testLists";

export async function getAllTestLists(): Promise<TestList[]> {
  const q = query(collection(db, TEST_LISTS_COL), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as TestList);
}

export async function getPublishedTestLists(): Promise<TestList[]> {
  const q = query(
    collection(db, TEST_LISTS_COL),
    where("status", "==", "published"),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as TestList);
}

export async function getTestListById(id: string): Promise<TestList | null> {
  const snap = await getDoc(doc(db, TEST_LISTS_COL, id));
  return snap.exists() ? (snap.data() as TestList) : null;
}

export async function createTestList(testList: TestList): Promise<void> {
  await setDoc(doc(db, TEST_LISTS_COL, testList.id), testList);
}

export async function updateTestList(id: string, data: Partial<TestList>): Promise<void> {
  await updateDoc(doc(db, TEST_LISTS_COL, id), { ...data, updatedAt: Date.now() });
}

export async function deleteTestList(id: string): Promise<void> {
  await deleteDoc(doc(db, TEST_LISTS_COL, id));
}
