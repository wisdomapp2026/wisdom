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
// USERS (Foydalanuvchilar)
// ============================================================
export interface User {
  id: string;
  phone: string;
  name: string;
  avatar?: string;
  role: UserRole;
  grade?: string; // "Grade 11 Student" kabi
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
  paymentMethod?: PaymentMethod;
  promoCode?: string;
}

// ============================================================
// COURSES (Kurslar / Fanlar)
// ============================================================
export interface Course {
  id: string;
  title: string; // "Boshlang'ich Matematika"
  description: string;
  category: string; // "Matematika", "Ona tili", "Ingliz tili"
  coverImage?: string; // Storage URL
  isPremium: boolean;
  price?: number; // agar alohida sotilsa
  totalStudents: number;
  onlineNow: number;
  progress?: number; // 0-100 (student uchun)
  testAfterEvery: number; // har nechta darsdan keyin test (admin belgilaydi), 0 = faqat oxirida
  tags: string[]; // ["National", "Certification", "Elite Prep"]
  order: number;
  createdAt: number;
  updatedAt: number;
  createdBy: string; // admin userId
}

// ============================================================
// TOPICS (Mavzular / Darslar - kurs ichida)
// ============================================================
export interface Topic {
  id: string;
  courseId: string;
  title: string; // "1-mavzu: Sonlar"
  description: string; // "Learn what variables are and..."
  icon?: string; // emoji yoki icon nomi
  order: number;
  isPremium: boolean;
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
  /** Video yechim — YouTube URL yoki upload */
  videoUrl?: string;
  videoType?: "youtube" | "upload";
  /** Bosqichma-bosqich yechim (Step-by-Step Solution) */
  solution?: SolutionStep[];
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
  title: string; // "Mathematics Mid-Term Assessment"
  description?: string;
  version: string; // "Draft v1", "Published"
  status: "draft" | "published";
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
}

export interface QuestionOption {
  label: string; // "A", "B", "C", "D"
  text: string;
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
  createdAt: number;
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
