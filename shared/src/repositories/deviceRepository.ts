/**
 * Device Session Repository — Qurilma sessiyalarini boshqarish
 * Bitta akkaunt maksimum 3 ta qurilmadan kirishi mumkin
 */
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  writeBatch,
} from "firebase/firestore";
import { db } from "../firebase";

export const MAX_DEVICES = 3;

export interface DeviceSession {
  id: string; // deviceId
  userId: string;
  deviceName: string; // "Chrome / Windows" kabi
  lastSeen: number; // timestamp
  createdAt: number;
  isActive: boolean;
}

const DEVICES_COL = "userDevices";

/** Qurilma sessiyasini yaratish yoki yangilash */
export async function registerDevice(userId: string, deviceId: string, deviceName: string): Promise<void> {
  const docId = `${userId}_${deviceId}`;
  await setDoc(doc(db, DEVICES_COL, docId), {
    id: deviceId,
    userId,
    deviceName,
    lastSeen: Date.now(),
    createdAt: Date.now(),
    isActive: true,
  });
}

/** Qurilma heartbeat — lastSeen yangilash. Sessiya o'chirilgan bo'lsa false qaytaradi */
export async function updateDeviceHeartbeat(userId: string, deviceId: string): Promise<boolean> {
  const docId = `${userId}_${deviceId}`;
  const ref = doc(db, DEVICES_COL, docId);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    await setDoc(ref, { ...snap.data(), lastSeen: Date.now(), isActive: true }, { merge: true });
    return true;
  }
  return false;
}

/** Qurilma sessiyasini o'chirish (logout) */
export async function removeDevice(userId: string, deviceId: string): Promise<void> {
  const docId = `${userId}_${deviceId}`;
  await deleteDoc(doc(db, DEVICES_COL, docId));
}

/** Foydalanuvchining barcha aktiv qurilmalarini olish */
export async function getUserDevices(userId: string): Promise<DeviceSession[]> {
  const q = query(collection(db, DEVICES_COL), where("userId", "==", userId));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => d.data() as DeviceSession)
    .sort((a, b) => b.lastSeen - a.lastSeen);
}

/**
 * Aktiv qurilmalar soni (oxirgi 2 daqiqada faol bo'lganlar)
 * Eskirgan sessiyalarni tozalab, faqat haqiqiy aktiv larini qaytaradi
 */
export async function getActiveDeviceCount(userId: string): Promise<number> {
  const devices = await getUserDevices(userId);
  const cutoff = Date.now() - 120000; // 2 daqiqa
  return devices.filter((d) => d.lastSeen >= cutoff && d.isActive).length;
}

/**
 * Qurilma sessiyasini yaratish yoki auto-evict (4-qurilma kirsa eng 1-qurilma sessiyasini tugatish)
 */
export async function registerDeviceAndEvictOldestIfNeeded(
  userId: string,
  deviceId: string,
  deviceName: string
): Promise<{ allowed: boolean; evictedOldest: boolean }> {
  const docId = `${userId}_${deviceId}`;
  const devices = await getUserDevices(userId);
  const cutoff = Date.now() - 120000; // 2 daqiqa
  const activeDevices = devices.filter((d) => d.lastSeen >= cutoff && d.isActive);

  // Bu qurilma allaqachon bor bo'lsa — update heartbeat
  const existingDevice = activeDevices.find((d) => d.id === deviceId);
  if (existingDevice) {
    await setDoc(
      doc(db, DEVICES_COL, docId),
      {
        id: deviceId,
        userId,
        deviceName,
        lastSeen: Date.now(),
        createdAt: existingDevice.createdAt || Date.now(),
        isActive: true,
      },
      { merge: true }
    );
    return { allowed: true, evictedOldest: false };
  }

  // Agar faol qurilmalar 3 yoki undan ko'p bo'lsa — ENG ESKI 1-qurilma sessiyasini tugatamiz (Auto-Kick)
  let evicted = false;
  if (activeDevices.length >= MAX_DEVICES) {
    const sortedByCreated = [...activeDevices].sort((a, b) => a.createdAt - b.createdAt);
    const oldestDevice = sortedByCreated[0];
    if (oldestDevice) {
      await deleteDoc(doc(db, DEVICES_COL, `${userId}_${oldestDevice.id}`));
      evicted = true;
    }
  }

  // Yangi qurilmani ro'yxatga olish
  await setDoc(doc(db, DEVICES_COL, docId), {
    id: deviceId,
    userId,
    deviceName,
    lastSeen: Date.now(),
    createdAt: Date.now(),
    isActive: true,
  });

  return { allowed: true, evictedOldest: evicted };
}

/**
 * 3 yoki undan ko'p qurilmadan bir vaqtda faol foydalanayotgan o'quvchilarni topish (Admin uchun)
 */
export async function getMultiDeviceUsers(): Promise<Array<{ userId: string; deviceCount: number; devices: DeviceSession[] }>> {
  const snap = await getDocs(collection(db, DEVICES_COL));
  const cutoff = Date.now() - 120000; // 2 daqiqa
  const userMap: Record<string, DeviceSession[]> = {};

  snap.docs.forEach((d) => {
    const dev = d.data() as DeviceSession;
    if (dev.lastSeen >= cutoff && dev.isActive) {
      if (!userMap[dev.userId]) userMap[dev.userId] = [];
      userMap[dev.userId].push(dev);
    }
  });

  const result: Array<{ userId: string; deviceCount: number; devices: DeviceSession[] }> = [];
  for (const [userId, devs] of Object.entries(userMap)) {
    if (devs.length >= MAX_DEVICES) {
      result.push({ userId, deviceCount: devs.length, devices: devs });
    }
  }

  return result;
}

/**
 * Qurilma limiti tekshiruvi:
 * - Agar bu qurilma allaqachon ro'yxatda bo'lsa — ruxsat beriladi
 * - Agar aktiv qurilmalar soni < MAX_DEVICES bo'lsa — ruxsat beriladi
 * - Aks holda — ruxsat berilmaydi
 */
export async function canDeviceLogin(userId: string, deviceId: string): Promise<{ allowed: boolean; activeDevices: DeviceSession[] }> {
  const devices = await getUserDevices(userId);
  const cutoff = Date.now() - 120000; // 2 daqiqa
  const activeDevices = devices.filter((d) => d.lastSeen >= cutoff && d.isActive);

  // Bu qurilma allaqachon ro'yxatda — ruxsat beriladi
  if (activeDevices.some((d) => d.id === deviceId)) {
    return { allowed: true, activeDevices };
  }

  // Limit tekshiruvi
  if (activeDevices.length < MAX_DEVICES) {
    return { allowed: true, activeDevices };
  }

  return { allowed: false, activeDevices };
}

/** Admin tomonidan foydalanuvchining qurilmasini majburan o'chirish */
export async function forceRemoveDevice(userId: string, deviceId: string): Promise<void> {
  const docId = `${userId}_${deviceId}`;
  await deleteDoc(doc(db, DEVICES_COL, docId));
}

/** Admin tomonidan foydalanuvchining barcha qurilmalarini o'chirish */
export async function removeAllUserDevices(userId: string): Promise<void> {
  const q = query(collection(db, DEVICES_COL), where("userId", "==", userId));
  const snap = await getDocs(q);
  if (snap.empty) return;

  const batch = writeBatch(db);
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
}

/** Eskirgan (2+ daqiqa faol bo'lmagan) sessiyalarni tozalash */
export async function cleanupStaleDevices(userId: string): Promise<void> {
  const devices = await getUserDevices(userId);
  const cutoff = Date.now() - 120000; // 2 daqiqa
  const stale = devices.filter((d) => d.lastSeen < cutoff);

  if (stale.length === 0) return;

  const batch = writeBatch(db);
  for (const device of stale) {
    batch.delete(doc(db, DEVICES_COL, `${userId}_${device.id}`));
  }
  await batch.commit();
}
