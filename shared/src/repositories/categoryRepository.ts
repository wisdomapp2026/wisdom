/**
 * Category Repository — Kategoriyalar uchun Firestore CRUD
 */
import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "../firebase";
import type { Category } from "../types";

const CATEGORIES_COL = "categories";

export async function getAllCategories(): Promise<Category[]> {
  const q = query(collection(db, CATEGORIES_COL), orderBy("order", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as Category);
}

export async function createCategory(category: Category): Promise<void> {
  await setDoc(doc(db, CATEGORIES_COL, category.id), category);
}

export async function updateCategory(categoryId: string, data: Partial<Category>): Promise<void> {
  await updateDoc(doc(db, CATEGORIES_COL, categoryId), data);
}

export async function deleteCategory(categoryId: string): Promise<void> {
  await deleteDoc(doc(db, CATEGORIES_COL, categoryId));
}
