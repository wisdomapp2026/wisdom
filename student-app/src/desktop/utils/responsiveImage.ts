/**
 * Desktop / mobil rasm tanlash yordamchilari.
 *
 * Admin har bir rasm uchun ikkita variant yuklashi mumkin:
 *   - mobil (asosiy maydon, masalan `coverImage`)
 *   - desktop (`coverImageDesktop`)
 *
 * Desktop varianti bo'lmasa — mobil variantga qaytamiz (fallback),
 * shunda eski kontent hech qanday o'zgarishsiz ishlashda davom etadi.
 */

import type { Course, HomeBanner, NewsItem } from "@shared/types";

export interface ResolvedImage {
  url: string;
  objectFit: "cover" | "contain";
  objectPosition: string;
  /** Desktop uchun maxsus rasm topildimi (aks holda mobil rasm cho'zilgan) */
  isDesktopSpecific: boolean;
}

const EMPTY: ResolvedImage = {
  url: "",
  objectFit: "cover",
  objectPosition: "50% 50%",
  isDesktopSpecific: false,
};

/** Kurs muqovasi (kartochka) — desktopda 1600×900 px tavsiya etiladi */
export function resolveCourseCover(course: Partial<Course> | null | undefined): ResolvedImage {
  if (!course) return EMPTY;
  const desktopUrl = course.coverImageDesktop?.trim();
  if (desktopUrl) {
    return {
      url: desktopUrl,
      objectFit: course.coverFitDesktop || "cover",
      objectPosition: course.coverPositionDesktop || "50% 50%",
      isDesktopSpecific: true,
    };
  }
  const url = course.coverImage?.trim() || "";
  if (!url) return EMPTY;
  return {
    url,
    objectFit: course.coverFit || "cover",
    objectPosition: course.coverPosition || "50% 50%",
    isDesktopSpecific: false,
  };
}

/** Kurs hero rasmi (kitob muqovasi) — desktopda 600×800 px tavsiya etiladi */
export function resolveCourseHero(course: Partial<Course> | null | undefined): ResolvedImage {
  if (!course) return EMPTY;
  const desktopUrl = course.heroImageDesktop?.trim();
  if (desktopUrl) {
    return {
      url: desktopUrl,
      objectFit: course.heroImageFitDesktop || "cover",
      objectPosition: course.heroImagePositionDesktop || "50% 50%",
      isDesktopSpecific: true,
    };
  }
  const url = course.heroImage?.trim() || "";
  if (!url) return EMPTY;
  return {
    url,
    objectFit: course.heroImageFit || "cover",
    objectPosition: course.heroImagePosition || "50% 50%",
    isDesktopSpecific: false,
  };
}

export interface ResolvedBannerImage extends ResolvedImage {
  /** 0..1 oralig'ida CSS opacity qiymati */
  opacity: number;
}

/** Banner rasmi — desktopda 2400×800 px (3:1) tavsiya etiladi */
export function resolveBannerImage(banner: Partial<HomeBanner> | null | undefined): ResolvedBannerImage {
  const fallbackOpacity = (raw: number | undefined, def: number) =>
    Math.max(0, Math.min(100, raw ?? def)) / 100;

  if (!banner) return { ...EMPTY, opacity: 1 };

  const desktopUrl = banner.imageUrlDesktop?.trim();
  if (desktopUrl) {
    return {
      url: desktopUrl,
      objectFit: banner.imageFitDesktop || banner.imageFit || "cover",
      objectPosition: banner.imagePositionDesktop || banner.imagePosition || "center",
      isDesktopSpecific: true,
      opacity: fallbackOpacity(
        banner.imageOpacityDesktop ?? banner.imageOpacity,
        banner.imageFullWidth ? 70 : 50
      ),
    };
  }

  const url = banner.imageUrl?.trim() || "";
  if (!url) return { ...EMPTY, opacity: 1 };
  return {
    url,
    objectFit: banner.imageFit || "cover",
    objectPosition: banner.imagePosition || "center",
    isDesktopSpecific: false,
    opacity: fallbackOpacity(banner.imageOpacity, banner.imageFullWidth ? 70 : 50),
  };
}

/** Yangilik rasmi — desktopda 640×880 px tavsiya etiladi */
export function resolveNewsImage(item: Partial<NewsItem> | null | undefined): string {
  if (!item) return "";
  return item.imageUrlDesktop?.trim() || item.imageUrl?.trim() || "";
}

/** YouTube URL dan yuqori sifatli thumbnail (desktopda mqdefault juda past sifatli) */
export function getYouTubeThumbnailHQ(url: string): string {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
  return match ? `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg` : "";
}
