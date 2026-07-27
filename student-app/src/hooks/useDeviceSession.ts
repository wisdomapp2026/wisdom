import { useState, useEffect, useRef } from "react";
import {
  registerDevice,
  updateDeviceHeartbeat,
  removeDevice,
  canDeviceLogin,
  cleanupStaleDevices,
  MAX_DEVICES,
} from "@shared/repositories";
import type { DeviceSession } from "@shared/repositories/deviceRepository";

const DEVICE_ID_KEY = "edukids_device_id";
const HEARTBEAT_INTERVAL = 30000; // 30 soniya

/**
 * Qurilma uchun unikal ID generatsiya qilish.
 * localStorage da saqlanadi — brauzer o'chirilmaguncha o'zgarmas.
 */
function getOrCreateDeviceId(): string {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    // Unikal fingerprint yaratish
    const random = Math.random().toString(36).substring(2, 10);
    const timestamp = Date.now().toString(36);
    id = `dev-${random}-${timestamp}`;
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

/**
 * Qurilma nomini aniqlash (brauzer + OS).
 */
function getDeviceName(): string {
  const ua = navigator.userAgent;
  let browser = "Noma'lum";
  let os = "";

  // Browser aniqlash
  if (ua.includes("Firefox")) browser = "Firefox";
  else if (ua.includes("Edg")) browser = "Edge";
  else if (ua.includes("Chrome")) browser = "Chrome";
  else if (ua.includes("Safari")) browser = "Safari";
  else if (ua.includes("Opera") || ua.includes("OPR")) browser = "Opera";

  // OS aniqlash
  if (ua.includes("Windows")) os = "Windows";
  else if (ua.includes("Mac")) os = "macOS";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";
  else if (ua.includes("Linux")) os = "Linux";

  return `${browser}${os ? " / " + os : ""}`;
}

export interface DeviceSessionState {
  checking: boolean;
  allowed: boolean;
  deviceId: string;
  activeDevices: DeviceSession[];
  maxDevices: number;
}

/**
 * Qurilma sessiyasini boshqaruvchi hook.
 * - Login qilinganda qurilma limitini tekshiradi
 * - Ruxsat berilsa — sessiya yaratadi va heartbeat boshlaydi
 * - Ruxsat berilmasa — "Qurilma limiti" ekranini ko'rsatish uchun state qaytaradi
 */
export function useDeviceSession(userId: string | undefined): DeviceSessionState {
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(true);
  const [activeDevices, setActiveDevices] = useState<DeviceSession[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const deviceId = getOrCreateDeviceId();
  const deviceName = getDeviceName();

  useEffect(() => {
    if (!userId) {
      setChecking(false);
      setAllowed(true);
      return;
    }

    let cancelled = false;

    async function checkAndRegister() {
      setChecking(true);
      try {
        // Avval eskirgan sessiyalarni tozalash
        await cleanupStaleDevices(userId!);

        // Limit tekshiruvi
        const result = await canDeviceLogin(userId!, deviceId);
        if (cancelled) return;

        setActiveDevices(result.activeDevices);

        if (result.allowed) {
          // Qurilmani ro'yxatga olish
          await registerDevice(userId!, deviceId, deviceName);
          setAllowed(true);

          // Heartbeat boshlash
          intervalRef.current = setInterval(() => {
            updateDeviceHeartbeat(userId!, deviceId).catch(console.error);
          }, HEARTBEAT_INTERVAL);
        } else {
          setAllowed(false);
        }
      } catch (err) {
        console.error("Device session error:", err);
        // Xatolik bo'lsa — ruxsat beramiz (fail-open), chunki teknik muammo tufayli userni bloklamaslik kerak
        setAllowed(true);
      } finally {
        if (!cancelled) setChecking(false);
      }
    }

    checkAndRegister();

    // Sahifa yopilganda sessiyani o'chirish
    const handleBeforeUnload = () => {
      removeDevice(userId!, deviceId).catch(() => {});
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      cancelled = true;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      window.removeEventListener("beforeunload", handleBeforeUnload);
      // Komponent unmount bo'lganda sessiyani o'chirish
      if (userId) {
        removeDevice(userId, deviceId).catch(() => {});
      }
    };
  }, [userId]);

  return { checking, allowed, deviceId, activeDevices, maxDevices: MAX_DEVICES };
}
