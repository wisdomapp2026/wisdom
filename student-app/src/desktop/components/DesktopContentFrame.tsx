import type { ReactNode } from "react";

/**
 * Desktop uchun "o'qish maydoni" ramkasi.
 *
 * Bosh sahifa, Kurslar, Testlar va Profil uchun to'liq desktop dizayn yozilgan.
 * Qolgan sahifalar (kurs ichi, mavzu, test ekrani, sertifikatlar va h.k.) —
 * MOBIL komponentni o'zini ishlatadi, chunki ularning ichki mantiqi juda
 * murakkab va uni ko'chirish xatoliklarga olib kelishi mumkin.
 *
 * Shu sababli mobil kontentni desktopda chiroyli ko'rsatish uchun:
 *  - markazda, o'qishga qulay kenglikda (variant bo'yicha) joylashtiramiz
 *  - kartochka ko'rinishi (fon + soya + radius) beramiz
 *  - `page-content` ning mobil padding/animatsiyasini desktop.css bekor qiladi
 *
 * MUHIM: mobil komponentlarning kodiga hech qanday o'zgartirish kiritilmaydi.
 */
export default function DesktopContentFrame({
  children,
  width = "reading",
  bare = false,
}: {
  children: ReactNode;
  /** `reading` — matn uchun tor (860px), `wide` — kengroq (1180px), `full` — cheklovsiz */
  width?: "reading" | "wide" | "full";
  /** true bo'lsa kartochka fon/soyasi qo'shilmaydi (sahifa o'zi fon beradi) */
  bare?: boolean;
}) {
  const maxWidth = width === "reading" ? 880 : width === "wide" ? 1180 : undefined;

  if (bare) {
    return (
      <div className="dk-frame mx-auto w-full" style={{ maxWidth }}>
        {children}
      </div>
    );
  }

  return (
    <div className="dk-frame mx-auto w-full" style={{ maxWidth }}>
      <div
        className="rounded-[26px] overflow-hidden"
        style={{
          backgroundColor: "var(--theme-card-bg)",
          border: "1px solid var(--dk-border)",
          boxShadow: "var(--dk-shadow-md)",
        }}
      >
        {children}
      </div>
    </div>
  );
}
