/**
 * Input sanitizatsiya — XSS himoyasi va uzunlik cheklash
 */

/** HTML teglarni olib tashlash (XSS himoyasi) */
export function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, "").trim();
}

/** Matn uzunligini cheklash */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength);
}

/** Xavfsiz matn — HTML olib tashlash + uzunlik cheklash */
export function sanitizeText(text: string | undefined | null, maxLength = 5000): string {
  if (!text) return "";
  return truncate(stripHtml(text), maxLength);
}

/** Ism/familiya — maxsus belgilar cheklangan */
export function sanitizeName(name: string | undefined | null): string {
  if (!name) return "";
  // Faqat harflar, raqamlar, bo'sh joy, tire, apostrof ruxsat
  return truncate(name.replace(/[<>"{}|\\^`]/g, "").trim(), 200);
}

/** Telefon raqam — faqat raqamlar va + */
export function sanitizePhone(phone: string | undefined | null): string {
  if (!phone) return "";
  return truncate(phone.replace(/[^0-9+\-() ]/g, ""), 20);
}

/** URL validatsiya */
export function isValidUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}
