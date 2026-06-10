import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  orderBy,
  where,
} from "firebase/firestore";
import { db } from "../firebase";
import type { Message } from "../types";

const MESSAGES_COL = "messages";

export async function sendMessage(message: Message): Promise<void> {
  await setDoc(doc(db, MESSAGES_COL, message.id), message);
}

export async function getAllMessages(): Promise<Message[]> {
  const q = query(collection(db, MESSAGES_COL), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as Message);
}

export async function getMessagesByUser(userId: string): Promise<Message[]> {
  const q = query(collection(db, MESSAGES_COL), where("fromUserId", "==", userId), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as Message);
}

export async function getMessagesForUser(userId: string): Promise<Message[]> {
  const q = query(collection(db, MESSAGES_COL), where("toUserId", "==", userId), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as Message);
}

export async function getUnreadMessagesCount(): Promise<number> {
  const q = query(collection(db, MESSAGES_COL), where("fromRole", "==", "student"), where("isRead", "==", false));
  const snap = await getDocs(q);
  return snap.size;
}

export async function markMessageAsRead(messageId: string): Promise<void> {
  await updateDoc(doc(db, MESSAGES_COL, messageId), { isRead: true });
}
