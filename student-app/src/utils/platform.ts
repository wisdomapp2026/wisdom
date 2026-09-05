/**
 * Platforma aniqlash va OAuth redirect manzilini to'g'ri hisoblash.
 *
 * MUAMMO: Capacitor (Android APK) ichida ilova lokal fayllardan ishlaydi,
 * shu sababli `window.location.origin` = "http://localhost" bo'ladi.
 * Agar Google OAuth ga shu origin `redirectTo` sifatida berilsa, login
 * tugagach brauzer "localhost:3000" ga qaytaradi va ERR_CONNECTION_REFUSED
 * xatosi chiqadi. Native platformada har doim haqiqiy web domen ishlatiladi.
 */

/** Ilova Capacitor (native Android/iOS) ichida ishlayaptimi? */
export function isNativeApp(): boolean {
  const cap = (window as any).Capacitor;
  if (cap?.isNativePlatform) {
    try {
      return cap.isNativePlatform() === true;
    } catch {
      // pass
    }
  }
  // Zaxira: capacitor:// yoki localhost protokoli orqali aniqlash
  const proto = window.location.protocol;
  return proto === "capacitor:" || proto === "file:";
}

/** Production web sayt manzili — native app OAuth uchun shu domenga qaytadi */
export const WEB_APP_ORIGIN = "https://www.wisdomapp.uz";

/**
 * OAuth `redirectTo` uchun to'g'ri asosiy manzil.
 * Web da — joriy origin, native app da — haqiqiy web domen.
 */
export function getAuthRedirectBase(): string {
  return isNativeApp() ? WEB_APP_ORIGIN : window.location.origin;
}
