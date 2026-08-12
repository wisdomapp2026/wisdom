/**
 * Native (Android status bar) bildirishnomalar.
 *
 * Web da hech narsa qilmaydi — faqat Capacitor (APK) ichida ishlaydi.
 * Yangi bildirishnoma kelganda status barda ko'rsatiladi.
 */
import { isNativeApp } from "./platform";

const SHOWN_IDS_KEY = "edukids_native_shown_notifs";

/** Allaqachon status barda ko'rsatilgan bildirishnoma ID lari */
function getShownIds(): string[] {
  try {
    return JSON.parse(localStorage.getItem(SHOWN_IDS_KEY) || "[]");
  } catch {
    return [];
  }
}

function addShownId(id: string): void {
  try {
    const ids = getShownIds();
    ids.push(id);
    localStorage.setItem(SHOWN_IDS_KEY, JSON.stringify(ids.slice(-200)));
  } catch {
    // localStorage to'lgan
  }
}

/** Bildirishnoma ruxsatini so'rash va click listener'ni ro'yxatga olish */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!isNativeApp()) return false;
  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    const current = await LocalNotifications.checkPermissions();
    if (current.display === "granted") {
      registerClickListener();
      return true;
    }
    const result = await LocalNotifications.requestPermissions();
    if (result.display === "granted") {
      registerClickListener();
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/** Bildirishnomaga bosilganda — bildirishnomalar sahifasiga o'tish */
let listenerRegistered = false;
async function registerClickListener() {
  if (listenerRegistered) return;
  listenerRegistered = true;
  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    await LocalNotifications.addListener("localNotificationActionPerformed", () => {
      // React Router da bildirishnomalar sahifasiga yo'naltirish
      window.location.hash = "";
      window.location.href = "/notifications";
    });
  } catch {
    // Plugin mavjud emas
  }
}

/**
 * Yangi (hali ko'rsatilmagan) bildirishnomalarni status barda chiqarish.
 * @param items Bildirishnomalar ro'yxati (id, title, body)
 */
export async function showNewNotifications(
  items: { id: string; title: string; body?: string }[]
): Promise<void> {
  if (!isNativeApp() || items.length === 0) return;

  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");

    const perm = await LocalNotifications.checkPermissions();
    if (perm.display !== "granted") return;

    const shown = getShownIds();
    const fresh = items.filter((n) => !shown.includes(n.id));
    if (fresh.length === 0) return;

    await LocalNotifications.schedule({
      notifications: fresh.map((n, idx) => ({
        // Capacitor id raqam bo'lishi kerak — vaqt asosida unikal qiymat
        id: Number(String(Date.now()).slice(-6)) + idx,
        title: n.title || "tushunGo",
        body: n.body || "",
        smallIcon: "ic_launcher",
      })),
    });

    fresh.forEach((n) => addShownId(n.id));
  } catch {
    // Plugin mavjud bo'lmasa yoki xato bo'lsa — jim o'tamiz
  }
}
