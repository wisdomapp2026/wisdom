// ============================================================
// EduKids - Ma'lumotlar modellari (Firestore collections)
// ============================================================

/** Foydalanuvchi roli */
export type UserRole = "admin" | "student";

/** Obuna holati */
export type SubscriptionStatus = "free" | "active" | "expired" | "cancelled";

/** Qiyinlik darajasi */
export type Difficulty = "easy" | "medium" | "hard";

/** Test savol turi */
export type QuestionType = "multiple_choice" | "true_false" | "short_answer";

/** To'lov usuli */
export type PaymentMethod = "click" | "payme" | "uzum_bank" | "card";

// ============================================================
// CATEGORIES (Kategoriyalar)
// ============================================================
export interface Category {
  id: string;
  name: string; // "Matematika", "Fizika" va h.k.
  order: number;
  createdAt: number;
}

// ============================================================
// USERS (Foydalanuvchilar)
// ============================================================
export interface User {
  id: string;
  phone: string;
  name: string;
  avatar?: string;
  role: UserRole;
  grade?: string; // "Grade 11 Student" kabi
  isBanned?: boolean; // Admin tomonidan ban qilingan
  bannedAt?: number; // Ban qilingan vaqt
  createdAt: number; // timestamp
  updatedAt: number;
}

// ============================================================
// SUBSCRIPTIONS (Obunalar)
// ============================================================
export interface Subscription {
  id: string;
  userId: string;
  courseId?: string; // kursga biriktirilgan obuna, null bo'lsa — barcha premium
  status: SubscriptionStatus;
  plan: string; // "Milliy sertifikat kursi" kabi
  pricePerMonth: number; // so'm hisobida (50000)
  startDate: number;
  endDate: number;
  cancelledAt?: number; // admin bekor qilgan sana
  paymentMethod?: PaymentMethod;
  promoCode?: string;
}

// ============================================================
// COURSES (Kurslar / Fanlar)
// ============================================================

/** Kursni tanishtirish bo'limi (video + matn + rasm) */
export interface CourseIntroduction {
  videoUrl?: string; // YouTube yoki upload qilingan video
  videoType?: "youtube" | "upload";
  text: string; // Kurs haqida qisqacha tushuntirish
  thumbnailUrl?: string; // Video uchun thumbnail rasm
  imageUrl?: string; // Tanishtirish rasmi (admin upload qiladi)
  /** Videodan keyin ko'rsatiladigan qo'shimcha matn (admin yozadi, video ostida ko'rinadi) */
  afterVideoText?: string;
  /** Biriktirilgan fayl (PDF, Word va h.k.) — student yuklab olishi mumkin */
  attachedFileUrl?: string;
  /** Fayl asl nomi (yuklab olishda ko'rsatish uchun) */
  attachedFileName?: string;
}

export interface Course {
  id: string;
  title: string; // "Boshlang'ich Matematika"
  description: string;
  category: string; // "Matematika", "Ona tili", "Ingliz tili"
  coverImage?: string; // Storage URL
  coverPosition?: string; // "50% 50%" — CSS object-position (drag orqali tanlanadi)
  coverFit?: "cover" | "contain"; // CSS object-fit
  /** Kurs sahifasi headeridagi kichik rasm (kitob muqovasi) — Storage URL */
  heroImage?: string;
  /** Hero rasm pozitsiyasi (CSS object-position) */
  heroImagePosition?: string;
  /** Hero rasm o'lchami (CSS object-fit) */
  heroImageFit?: "cover" | "contain";
  isPremium: boolean;
  isHidden?: boolean; // Admin yashirgan — studentda ko'rinmaydi
  /** Bosh sahifada ko'rsatilsinmi (admin belgilaydi). Default: true (belgilanmagan bo'lsa ko'rinadi).
   *  Bosh sahifada faqat admin tanlagan (maksimum 10 tagacha) kurslar ko'rinadi,
   *  qolganlari "Kurslar" sahifasida ko'rinishda davom etadi. */
  showOnHomepage?: boolean;
  price?: number; // agar alohida sotilsa
  /** Kurs narxi (so'm) — premium bo'lganda */
  coursePrice?: number;
  /** Narx turi: "one_time" — bir martalik, "subscription" — obuna */
  pricingType?: "one_time" | "subscription";
  /** Obuna tariflari (pricingType === "subscription" bo'lganda) */
  subscriptionPlans?: Array<{
    id: string;
    label: string; // "1 oylik", "3 oylik", "6 oylik", "1 yillik"
    months: number; // 1, 3, 6, 12
    price: number; // so'm
  }>;
  /** Premium foydalari ro'yxati — student app da ko'rsatiladi */
  premiumBenefits?: string[];
  totalStudents: number;
  onlineNow: number;
  progress?: number; // 0-100 (student uchun)
  testAfterEvery: number; // har nechta darsdan keyin test (admin belgilaydi), 0 = faqat oxirida
  /** Kurs ochilish rejimi:
   * "sequential" — ketma-ket: 1-modul tugatilgach 2-modul ochiladi, mavzular ham ketma-ket
   * "open" — ochiq: barcha modul va mavzular ochiq (premiumdan tashqari)
   */
  unlockMode?: "sequential" | "open";
  tags: string[]; // ["National", "Certification", "Elite Prep"]
  order: number;
  /** Kursni tanishtirish bo'limi — avtomatik yaratiladi */
  introduction?: CourseIntroduction;
  createdAt: number;
  updatedAt: number;
  createdBy: string; // admin userId
}

// ============================================================
// FOLDERS (Papkalar / Kitoblar — kurs ichida mavzu va testlarni guruhlash)
// ============================================================
export interface Folder {
  id: string;
  courseId: string;
  title: string; // "IDC 1", "IDC 2" kabi kitob nomi
  description?: string;
  icon?: string; // emoji
  coverImage?: string; // kitob muqovasi (Storage URL)
  order: number;
  isPremium?: boolean;
  isHidden?: boolean; // Admin yashirgan — studentda ko'rinmaydi
  createdAt: number;
  updatedAt: number;
}

// ============================================================
// TOPICS (Mavzular / Darslar - kurs ichida)
// ============================================================
export interface Topic {
  id: string;
  courseId: string;
  folderId?: string; // qaysi papkaga tegishli (bo'sh bo'lsa — papkasiz)
  title: string; // "1-mavzu: Sonlar"
  description: string; // "Learn what variables are and..."
  icon?: string; // emoji yoki icon nomi
  order: number;
  isPremium: boolean;
  isHidden?: boolean; // Admin yashirgan — studentda ko'rinmaydi
  /** Modulni tanishtirish bo'limi — kursni tanishtirish blokiga o'xshash (video + matn + rasm) */
  introduction?: CourseIntroduction;
  createdAt: number;
  updatedAt: number;
}

// ============================================================
// ADVICE (Maslahat bloklari — kurs ichida, mavzular orasida)
// ============================================================
export interface Advice {
  id: string;
  courseId: string;
  folderId?: string; // qaysi papkaga tegishli (bo'sh bo'lsa — papkasiz)
  title: string; // "Maslahat"
  text: string; // "IDC-1 Geometriya bo'limini tugatishdan oldin..."
  icon?: string; // emoji yoki icon nomi
  afterTopicOrder: number; // qaysi mavzudan keyin joylashadi
  createdAt: number;
  updatedAt: number;
}

// ============================================================
// PROBLEMS (Misollar - mavzu ichida)
// ============================================================
export interface Problem {
  id: string;
  topicId: string;
  courseId: string;
  /** Misol matni — LaTeX va oddiy text aralashmasi */
  content: string;
  /** Qo'shimcha rasm (upload qilingan) */
  image?: string; // Storage URL
  difficulty: Difficulty;
  order: number;
  /** Premium misol (login + obuna talab etiladi) */
  isPremium?: boolean;
  /** Admin yashirgan — studentda ko'rinmaydi */
  isHidden?: boolean;
  /** Video yechim — YouTube URL yoki upload */
  videoUrl?: string;
  videoType?: "youtube" | "upload";
  /** Bosqichma-bosqich yechim (Step-by-Step Solution) */
  solution?: SolutionStep[];
  /** Yechim rasmi */
  solutionImage?: string;
  /** Admin belgilagan teglar (#Algebra, #Geometry...) */
  tags: string[];
  /** Vaqt chegarasi (daqiqalarda) */
  estimatedMinutes?: number;
  createdAt: number;
}

export interface SolutionStep {
  stepNumber: number;
  text: string; // LaTeX qo'llab-quvvatlanadi
  category?: string; // "Geometry", "Algebra" kabi
}

// ============================================================
// TESTS (Testlar - kurs oxirida yoki har N darsdan keyin)
// ============================================================
export interface Test {
  id: string;
  courseId: string;
  folderId?: string; // qaysi papkaga tegishli (bo'sh bo'lsa — papkasiz)
  title: string; // "Mathematics Mid-Term Assessment"
  description?: string;
  version: string; // "Draft v1", "Published"
  status: "draft" | "published";
  isPremium?: boolean; // Premium test (obuna talab etiladi)
  gradeLevel?: string; // "Primary 5"
  subject?: string; // "Mathematics"
  passingScore: number; // 28/45 kabi
  shuffleQuestions: boolean;
  totalPoints: number;
  totalTime: number; // daqiqalarda
  questions: Question[];
  afterTopicOrder?: number; // qaysi mavzudan keyin, null = kurs oxirida
  createdAt: number;
  updatedAt: number;
  createdBy: string;
}

export interface Question {
  id: string;
  type: QuestionType;
  content: string; // Savol matni (LaTeX)
  image?: string;
  options?: QuestionOption[]; // multiple_choice uchun
  correctAnswer: string; // "B" yoki "true" yoki matn
  points: number;
  estimatedMinutes: number;
  difficulty: Difficulty;
  tags: string[];
  topicTag?: string; // "TOPIC: SQUARES" kabi
  /** Video yechim — noto'g'ri javob berilganda tavsiya qilinadi */
  videoUrl?: string;
  videoType?: "youtube" | "upload";
  /** Savol qaysi misoldan yaratilgan (misol → test savoli bog'lanishi) */
  problemId?: string;
  /** Bosqichma-bosqich yechim — misoldan ko'chiriladi */
  solution?: SolutionStep[];
  /** Yechim rasmi — misoldan ko'chiriladi */
  solutionImage?: string;
}

export interface QuestionOption {
  label: string; // "A", "B", "C", "D"
  text: string;
}

// ============================================================
// TEST LISTS (Test ro'yxatlari — admin yaratadi, studentga ko'rinadi)
// ============================================================
export interface TestList {
  id: string;
  title: string; // "Arifmetika testlari"
  description?: string;
  testIds: string[]; // kurs ichidagi test ID lari (courses/{courseId}/tests/)
  /** Published bo'lsa student mobile app da ko'rinadi */
  status: "draft" | "published";
  /** Qaysi kursdan testlar olingan (ixtiyoriy) */
  courseId?: string;
  createdAt: number;
  updatedAt: number;
  createdBy: string;
}

// ============================================================
// TEST RESULTS (O'quvchi test natijalari)
// ============================================================
export interface TestResult {
  id: string;
  testId: string;
  userId: string;
  courseId: string;
  score: number; // foizda (85)
  correctCount: number;
  totalQuestions: number;
  timeTaken: number; // soniyalarda
  grade: string; // "A", "B", "C"
  answers: AnswerRecord[];
  completedAt: number;
}

export interface AnswerRecord {
  questionId: string;
  selectedAnswer: string;
  isCorrect: boolean;
}

// ============================================================
// PROGRESS (O'quvchi progressi)
// ============================================================
export interface UserProgress {
  id: string; // `${userId}_${courseId}`
  userId: string;
  courseId: string;
  completedTopics: string[]; // topic ID lar
  completedProblems: string[]; // problem ID lar
  currentTopicId?: string;
  progressPercent: number; // 0-100
  totalXP: number;
  streak: number; // kunlik streak
  weeklyMinutes: number[];  // [Mon, Tue, ..., Sun]
  lastAccessedAt: number;
  isJoined?: boolean;
  enrolledAt?: number;
  testXP?: number;
  testResults?: Record<string, any>;
}

// ============================================================
// PAYMENTS (To'lovlar)
// ============================================================
export interface Payment {
  id: string;
  userId: string;
  userName: string;
  subscriptionId?: string;
  courseId?: string;
  courseTitle: string;
  amount: number; // so'm
  method: PaymentMethod;
  status: "pending" | "success" | "failed";
  promoCode?: string;
  discount: number;
  /** Student pul o'tkazgan karta raqami (masalan: 8600 **** **** 1234) */
  cardNumber?: string;
  /** Student telefon raqami (fors-major uchun) */
  senderPhone?: string;
  /** Admin kartasi (pul qayerga tushgan) */
  recipientCard?: string;
  /** To'lov screenshoti (chek rasmi) */
  screenshotUrl?: string;
  /** Admin tasdiqlagan vaqt */
  confirmedAt?: number;
  createdAt: number;
}

// ============================================================
// MESSAGES (O'quvchi-Admin habarlar)
// ============================================================
export interface Message {
  id: string;
  fromUserId: string;
  fromName: string;
  fromRole: "student" | "admin";
  toUserId?: string; // admin ga yuborganda bo'sh
  text: string;
  isRead: boolean;
  createdAt: number;
}

// ============================================================
// FAVORITE TOPICS (Tanlangan mavzular — student bookmark qiladi)
// ============================================================
export interface FavoriteTopic {
  id: string; // `${userId}_${topicId}`
  userId: string;
  courseId: string;
  topicId: string;
  topicTitle: string;
  createdAt: number;
}

// ============================================================
// USER ACTIVITY (O'quvchi faolligi — kunlik ishlatish vaqti)
// ============================================================
export interface UserActivity {
  id: string; // `${userId}_${dateStr}` masalan: "user123_2026-06-19"
  userId: string;
  userName: string;
  date: string; // "2026-06-19" formatda
  totalMinutes: number; // shu kunda jami ishlatish vaqti (daqiqalarda)
  sessions: ActivitySession[]; // kirish/chiqish sessiyalari
  lastActiveAt: number; // oxirgi faollik timestamp
}

export interface ActivitySession {
  startedAt: number; // sessiya boshlangan vaqt (timestamp)
  endedAt?: number; // sessiya tugagan vaqt
  durationMinutes: number; // daqiqada
}

// ============================================================
// NEWS ITEMS (Yangiliklar — admin bosh sahifada boshqaradi)
// ============================================================
export type NewsItemType = "image" | "video";

export interface NewsItem {
  id: string;
  title: string;
  body?: string; // To'liq matn (batafsil)
  type: NewsItemType;
  imageUrl?: string; // Rasm (thumbnail yoki asosiy rasm)
  videoUrl?: string; // YouTube yoki upload video
  videoType?: "youtube" | "upload";
  duration?: string; // "03:45" kabi
  /** Rasmli yangilik uchun tashqi havola (brauzerda ochiladi) */
  linkUrl?: string;
  isActive: boolean;
  order: number;
  createdAt: number;
  updatedAt: number;
}

// ============================================================
// HOME BANNERS (Bosh sahifa bannerlari — admin boshqaradi)
// ============================================================
export interface HomeBanner {
  id: string;
  title: string; // "Milliy sertifikatga tayyormisiz?"
  subtitle?: string; // qo'shimcha kichik matn
  buttonText: string; // "Boshlash"
  courseId?: string; // tugma bosilganda qaysi kursga o'tadi
  linkUrl?: string; // yoki to'g'ridan-to'g'ri URL
  bgColor: string; // fon rangi (hex yoki tailwind) masalan: "#3b82f6"
  imageUrl?: string; // banner rasmi (ixtiyoriy)
  /** Rasm pozitsiyasi (CSS object-position): "center", "top", "left center" kabi */
  imagePosition?: string;
  /** Rasm o'lchami (CSS object-fit): "cover" | "contain" */
  imageFit?: "cover" | "contain";
  /** Rasmni banner bo'ylab to'liq yoyish (fon sifatida) */
  imageFullWidth?: boolean;
  /** Rasm shaffofligi (0-100, 100 = to'liq ko'rinadigan, 0 = butunlay shaffof) */
  imageOpacity?: number;
  /** Rasm qirqish: nechta foiz ko'rsatiladi (0-100, yuqoridan qirqish) */
  imageCropTop?: number;
  imageCropBottom?: number;
  /** Sarlavha va kichik matn rangi (hex), masalan "#ffffff" */
  textColor?: string;
  /** Matn shaffofligi (0-100, 100 = to'liq ko'rinadigan) */
  textOpacity?: number;
  /** Tugmani ko'rsatish (true) yoki bannerga to'g'ridan-to'g'ri bosganda kursga yo'naltirish (false). Default: true */
  showButton?: boolean;
  /** Tugma pozitsiyasi banner bo'ylab (CSS % formatda "x% y%"). Bo'sh bo'lsa — standart joyida (matndan pastda) turadi. */
  buttonPosition?: string;
  isActive: boolean;
  order: number;
  createdAt: number;
  updatedAt: number;
}

// ============================================================
// TESTIMONIALS (Foydalanuvchi otzivlari — bosh sahifada ko'rsatiladi)
// ============================================================
export interface Testimonial {
  id: string;
  /** Otziv qoldirgan foydalanuvchi ismi */
  name: string;
  /** Foydalanuvchi rasmi (Storage URL) */
  avatarUrl?: string;
  /** Qo'shimcha tavsif — masalan "Matematika kursi o'quvchisi" */
  role?: string;
  /** Otziv matni */
  text: string;
  /** Reyting bali — 1 dan 5 gacha yulduzcha */
  rating: number;
  /** Bosh sahifada ko'rinishi uchun */
  isActive: boolean;
  /** Ko'rsatish tartibi */
  order: number;
  createdAt: number;
  updatedAt: number;
}

// ============================================================
// ADMIN DASHBOARD STATS
// ============================================================
export interface DashboardStats {
  activeStudents: number;
  todayLogins: number;
  newSubscriptions: number;
  dailyRevenue: number;
  monthlyRevenue: number;
  totalRevenue: number;
  topCourse: string;
}

// ============================================================
// MOTIVATIONAL PHRASES (Motivatsion frazalar)
// ============================================================

/** Motivatsion fraza turi: bosh sahifada, kurslar ro'yxatida, kurs ichida yoki dars (mavzu) ichida */
export type MotivationPlacement = "home" | "courses_list" | "course" | "topic";

/** Ko'rsatish tartibi */
export type MotivationDisplayOrder = "sequential" | "random";

/** Motivatsion frazalar sozlamalari */
export interface MotivationSettings {
  id: string; // "course" yoki "topic"
  placement: MotivationPlacement;
  /** Har necha soatda almashtirish (masalan: 2 = har 2 soatda) */
  rotateHours: number;
  /** Ko'rsatish tartibi: ketma-ket yoki tasodifiy */
  displayOrder: MotivationDisplayOrder;
  updatedAt: number;
}

/** Bitta motivatsion fraza */
export interface MotivationalPhrase {
  id: string;
  placement: MotivationPlacement;
  text: string;
  order: number;
  isActive: boolean;
  createdAt: number;
}

// ============================================================
// SOCIAL LINKS (Ijtimoiy tarmoqlar)
// ============================================================

/** Mavjud ijtimoiy tarmoq turlari */
export type SocialPlatform =
  | "telegram"
  | "instagram"
  | "youtube"
  | "facebook"
  | "tiktok"
  | "twitter"
  | "linkedin"
  | "website";

/** Bitta ijtimoiy tarmoq havolasi */
export interface SocialLink {
  id: string;
  platform: SocialPlatform;
  label: string; // "Telegram kanal", "Instagram"
  url: string;
  /** Admin upload qilgan maxsus ikonka (agar bo'lsa — default SVG o'rniga shu ko'rinadi) */
  iconUrl?: string;
  isActive: boolean;
  order: number;
  createdAt: number;
  updatedAt: number;
}

// ============================================================
// PROMO CODES (Promo kodlar)
// ============================================================
export interface PromoCode {
  id: string;
  code: string; // "EDUKIDS50", "SALE20"
  discountPercent: number; // 10, 20, 50 (foizda)
  maxUses: number; // Necha marta ishlatilishi mumkin (0 = cheksiz)
  usedCount: number; // Necha marta ishlatilgan
  isActive: boolean;
  expiresAt?: number; // Amal qilish muddati
  createdAt: number;
  createdBy: string;
}

// ============================================================
// NOTIFICATIONS (Bildirishnomalar — admin uchun)
// ============================================================
export type NotificationType = "new_message" | "new_payment" | "new_student" | "new_test_result";

export interface AdminNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  isRead: boolean;
  data?: Record<string, string>; // qo'shimcha ma'lumot (userId, paymentId va h.k.)
  createdAt: number;
}

// ============================================================
// AUTHOR INFO (Muallif ma'lumotlari — admin sozlamalardan boshqaradi)
// ============================================================
export interface AuthorInfo {
  name: string;
  title?: string; // "Samarqand davlat chet tillari instituti" kabi
  bio: string; // muallif haqida matn
  avatarUrl?: string; // muallif rasmi
  socialLinks: AuthorSocialLink[];
}

export interface AuthorSocialLink {
  platform: SocialPlatform;
  url: string;
}

// ============================================================
// CERTIFICATES (Sertifikatlar — kurs 85%+ tamomlanganda beriladi)
// ============================================================
export interface Certificate {
  id: string; // `cert-${userId}-${courseId}`
  userId: string;
  userName: string;
  courseId: string;
  courseTitle: string;
  /** Tamomlash foizi (85-100) */
  completionPercent: number;
  /** Sertifikat berilgan sana */
  issuedAt: number;
  /** Unikal QR tekshiruv kodi */
  verificationCode: string;
}
