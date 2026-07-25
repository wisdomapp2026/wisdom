/**
 * Fayl yuklash validatsiyasi — barcha upload joylarida ishlatish kerak.
 * Max hajm limitlari va ruxsat berilgan turlar.
 */

/** Maksimal rasm hajmi: 5MB */
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

/** Maksimal video hajmi: 100MB */
export const MAX_VIDEO_SIZE = 100 * 1024 * 1024;

/** Maksimal umumiy fayl hajmi: 10MB */
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

/** Ruxsat berilgan rasm turlari */
export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
];

/** Ruxsat berilgan video turlari */
export const ALLOWED_VIDEO_TYPES = [
  "video/mp4",
  "video/webm",
  "video/ogg",
];

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Rasmni tekshirish — hajm va turi
 */
export function validateImageFile(file: File): FileValidationResult {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return { valid: false, error: `Ruxsat berilmagan fayl turi: ${file.type}. Faqat JPEG, PNG, GIF, WebP formatlar qabul qilinadi.` };
  }
  if (file.size > MAX_IMAGE_SIZE) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    return { valid: false, error: `Fayl juda katta (${sizeMB}MB). Maksimal 5MB ruxsat berilgan.` };
  }
  return { valid: true };
}

/**
 * Videoni tekshirish — hajm va turi
 */
export function validateVideoFile(file: File): FileValidationResult {
  if (!ALLOWED_VIDEO_TYPES.includes(file.type)) {
    return { valid: false, error: `Ruxsat berilmagan video turi: ${file.type}. Faqat MP4, WebM formatlar qabul qilinadi.` };
  }
  if (file.size > MAX_VIDEO_SIZE) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    return { valid: false, error: `Video juda katta (${sizeMB}MB). Maksimal 100MB ruxsat berilgan.` };
  }
  return { valid: true };
}

/**
 * Umumiy faylni tekshirish — hajm
 */
export function validateFile(file: File, maxSize = MAX_FILE_SIZE): FileValidationResult {
  if (file.size > maxSize) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    const limitMB = (maxSize / (1024 * 1024)).toFixed(0);
    return { valid: false, error: `Fayl juda katta (${sizeMB}MB). Maksimal ${limitMB}MB ruxsat berilgan.` };
  }
  return { valid: true };
}
