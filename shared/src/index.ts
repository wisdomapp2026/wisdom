export * from "./types";
export * from "./sanitize";
// Eslatma: backend Supabase ga ko'chirilgan. Firebase SDK endi ishlatilmaydi —
// `shared/src/firebase.ts` faqat migratsiya tarixini saqlash uchun qoldirilgan
// va bu yerdan eksport qilinmaydi (aks holda Firebase SDK bundle ga kirib qoladi).
export { supabase, toCamel, toSnake, stringToUUID, uploadFile } from "./supabase";
export * from "./repositories";
export * from "./fileValidation";
