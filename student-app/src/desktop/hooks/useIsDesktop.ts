import { useState, useEffect } from "react";
import { Capacitor } from "@capacitor/core";

/**
 * Desktop versiyaga o'tish chegarasi (px).
 * 1024px — planshetning landscape holati va noutbuklar orasidagi chegara.
 * Bundan kichik ekranlar mobil/planshet dizaynida qoladi.
 */
export const DESKTOP_BREAKPOINT = 1024;

/** Native APK ichida ishlayaptimi (Capacitor). Native'da har doim mobil dizayn. */
const IS_NATIVE = Capacitor.isNativePlatform();

/**
 * localStorage kaliti — foydalanuvchi "Mobil ko'rinishga o'tish" tugmasini bosgan bo'lsa.
 */
const FORCE_MOBILE_KEY = "tushungo-force-mobile";

function readForceMobile(): boolean {
  try {
    return localStorage.getItem(FORCE_MOBILE_KEY) === "true";
  } catch {
    return false;
  }
}

/** Hozirgi holatda desktop dizayn ko'rsatilishi kerakmi — sinxron hisoblash (SSR-safe) */
function computeIsDesktop(): boolean {
  if (IS_NATIVE) return false;
  if (typeof window === "undefined") return false;
  // Faqat ekran kengligiga qaraymiz — toggle tugmasi olib tashlangan
  return window.innerWidth >= DESKTOP_BREAKPOINT;
}

/**
 * Ekran kengligi asosida desktop dizaynni yoqish/o'chirish.
 *
 * MUHIM: Capacitor native (APK) ichida HAR DOIM `false` qaytaradi —
 * shuning uchun mobil ilova mantiqi va dizayni hech qachon o'zgarmaydi.
 */
export function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState<boolean>(computeIsDesktop);

  useEffect(() => {
    if (IS_NATIVE) return;

    // Agar oldin "Mobil ko'rinish" tugmasi bosilgan edi — tozalash
    // (tugma olib tashlangan, faqat ekran kengligiga qarab ishlaydi)
    try { localStorage.removeItem(FORCE_MOBILE_KEY); } catch {}

    const mql = window.matchMedia(`(min-width: ${DESKTOP_BREAKPOINT}px)`);
    const update = () => setIsDesktop(computeIsDesktop());

    // matchMedia — resize'dan arzonroq, faqat chegara kesib o'tilganda ishlaydi
    mql.addEventListener("change", update);

    // Boshlang'ich holatni sinxronlash (hydration farqi bo'lsa)
    update();

    return () => {
      mql.removeEventListener("change", update);
    };
  }, []);

  return isDesktop;
}

/** Foydalanuvchi qo'lda mobil ko'rinishga o'tishi / qaytishi */
export function setForceMobile(value: boolean): void {
  try {
    if (value) localStorage.setItem(FORCE_MOBILE_KEY, "true");
    else localStorage.removeItem(FORCE_MOBILE_KEY);
  } catch {
    // localStorage o'chirilgan bo'lsa — jim o'tamiz
  }
  // Reload — layout to'liq almashadi, holat aralashib ketmasligi uchun
  window.location.reload();
}

export function isForceMobile(): boolean {
  return readForceMobile();
}
