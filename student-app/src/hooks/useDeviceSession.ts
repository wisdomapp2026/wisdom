import { useState, useEffect, useRef } from "react";
import {
  registerDeviceAndEvictOldestIfNeeded,
  updateDeviceHeartbeat,
  cleanupStaleDevices,
  MAX_DEVICES,
} from "@shared/repositories";
import type { DeviceSession } from "@shared/repositories/deviceRepository";
import { signOut } from "firebase/auth";
import { auth } from "@shared/firebase";

const DEVICE_ID_KEY = "edukids_device_id";
const HEARTBEAT_INTERVAL = 30000; // 30 soniya

function getOrCreateDeviceId(): string {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    const random = Math.random().toString(36).substring(2, 10);
    const timestamp = Date.now().toString(36);
    id = `dev-${random}-${timestamp}`;
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

function getDeviceName(): string {
  const ua = navigator.userAgent;
  let browser = "Noma'lum";
  let os = "";

  if (ua.includes("Firefox")) browser = "Firefox";
  else if (ua.includes("Edg")) browser = "Edge";
  else if (ua.includes("Chrome")) browser = "Chrome";
  else if (ua.includes("Safari")) browser = "Safari";
  else if (ua.includes("Opera") || ua.includes("OPR")) browser = "Opera";

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

export function useDeviceSession(userId: string | undefined): DeviceSessionState {
  // checking boshida false — har safar F5 bosganda bloklovchi loader chiqmasligi uchun
  const [checking, setChecking] = useState(false);
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
      try {
        await cleanupStaleDevices(userId!);

        // Qurilmani ro'yxatga olish / auto-evict (4-qurilma kirsa 1-si avtomatik o'chiriladi)
        const result = await registerDeviceAndEvictOldestIfNeeded(userId!, deviceId, deviceName);
        if (cancelled) return;

        setAllowed(result.allowed);

        // Heartbeat boshlash
        intervalRef.current = setInterval(async () => {
          const active = await updateDeviceHeartbeat(userId!, deviceId);
          // Agar sessiya o'chirilgan bo'lsa (admin kick qilgan yoki 4-qurilma kirgan bo'lsa) — avtomatik logout
          if (!active) {
            console.warn("Sessiya tugatildi — tizimdan chiqilmoqda...");
            signOut(auth);
          }
        }, HEARTBEAT_INTERVAL);
      } catch (err) {
        console.error("Device session error:", err);
        setAllowed(true);
      }
    }

    checkAndRegister();

    return () => {
      cancelled = true;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [userId]);

  return { checking, allowed, deviceId, activeDevices, maxDevices: MAX_DEVICES };
}
