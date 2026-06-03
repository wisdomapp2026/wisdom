/**
 * EduKids — Demo kurs yaratish scripti
 * "Boshlang'ich Matematika" kursi: 10 ta mavzu, har birida misollar + video
 * 
 * Ishlatish: node shared/scripts/seed-demo.mjs
 * 
 * MUHIM: Firebase Console > Firestore > Rules da quyidagini yozing:
 *   allow read, write: if true;
 * (keyin production da o'zgartiramiz)
 */

import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../../.env") });

import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, writeBatch } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ============================================================
const COURSE_ID = "demo-boshlangich-matematika";
const ADMIN_ID = "admin-001";
const now = Date.now();

const course = {
  id: COURSE_ID,
  title: "Boshlang'ich Matematika",
  description: "Matematika asoslari: arifmetika, geometriya va algebraning boshlang'ich tushunchalari. 1-5 sinf o'quvchilari uchun.",
  category: "Matematika",
  coverImage: "",
  isPremium: false,
  totalStudents: 1240,
  onlineNow: 12,
  testAfterEvery: 5,
  tags: ["Boshlang'ich", "Matematika", "Bepul"],
  order: 1,
  createdAt: now,
  updatedAt: now,
  createdBy: ADMIN_ID,
};

const topics = [
  { id: "topic-01", title: "1-mavzu: Sonlar va sanash", description: "1 dan 100 gacha sonlarni tanish, sanash va taqqoslash", icon: "#️⃣", order: 1, isPremium: false },
  { id: "topic-02", title: "2-mavzu: Qo'shish asoslari", description: "Bir xonali va ikki xonali sonlarni qo'shish qoidalari", icon: "➕", order: 2, isPremium: false },
  { id: "topic-03", title: "3-mavzu: Ayirish asoslari", description: "Ayirish amali va uning xossalari", icon: "➖", order: 3, isPremium: false },
  { id: "topic-04", title: "4-mavzu: Ko'paytirish jadvali", description: "Ko'paytirish jadvalini o'rganish va yod olish usullari", icon: "✖️", order: 4, isPremium: false },
  { id: "topic-05", title: "5-mavzu: Bo'lish asoslari", description: "Sonlarni bo'lish, qoldiqli bo'lish tushunchasi", icon: "➗", order: 5, isPremium: false },
  { id: "topic-06", title: "6-mavzu: Kasrlar", description: "Oddiy kasrlar, kasrlarni solishtirish va qisqartirish", icon: "🔢", order: 6, isPremium: true },
  { id: "topic-07", title: "7-mavzu: O'nli kasrlar", description: "O'nli kasrlar bilan amallar: qo'shish, ayirish", icon: "📐", order: 7, isPremium: true },
  { id: "topic-08", title: "8-mavzu: Geometrik shakllar", description: "Uchburchak, to'rtburchak, doira — perimetr va yuza", icon: "📏", order: 8, isPremium: true },
  { id: "topic-09", title: "9-mavzu: Tenglamalar", description: "Sodda tenglamalarni yechish: x ni topish", icon: "🧮", order: 9, isPremium: true },
  { id: "topic-10", title: "10-mavzu: Matn masalalari", description: "Kundalik hayotga oid matematik masalalarni yechish", icon: "📝", order: 10, isPremium: true },
];

const problems = [
  { id: "p-01-1", topicId: "topic-01", content: "25 dan 35 gacha bo'lgan sonlarni ketma-ket yozing.", difficulty: "easy", order: 1, videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", videoType: "youtube", tags: ["Sonlar"], estimatedMinutes: 3, solution: [{ stepNumber: 1, text: "25 dan boshlab: 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35" }] },
  { id: "p-01-2", topicId: "topic-01", content: "Quyidagi sonlarni kichikdan kattaga tartiblang: 45, 12, 78, 3, 56", difficulty: "easy", order: 2, videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", videoType: "youtube", tags: ["Sonlar", "Taqqoslash"], estimatedMinutes: 2, solution: [{ stepNumber: 1, text: "Tartib: 3, 12, 45, 56, 78" }] },
  { id: "p-01-3", topicId: "topic-01", content: "89 sonidagi o'nliklar soni nechta?", difficulty: "medium", order: 3, videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", videoType: "youtube", tags: ["Sonlar", "Xonalar"], estimatedMinutes: 2, solution: [{ stepNumber: 1, text: "89 = 8 o'nlik + 9 birlik. Javob: 8" }] },
  { id: "p-02-1", topicId: "topic-02", content: "$$23 + 45 = ?$$", difficulty: "easy", order: 1, videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", videoType: "youtube", tags: ["Qo'shish"], estimatedMinutes: 2, solution: [{ stepNumber: 1, text: "3+5=8, 2+4=6. Javob: 68" }] },
  { id: "p-02-2", topicId: "topic-02", content: "$$156 + 287 = ?$$", difficulty: "medium", order: 2, videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", videoType: "youtube", tags: ["Qo'shish"], estimatedMinutes: 3, solution: [{ stepNumber: 1, text: "6+7=13, 5+8+1=14, 1+2+1=4. Javob: 443" }] },
  { id: "p-02-3", topicId: "topic-02", content: "Ali 34 ta olma terdi, Vali 28 ta. Jami nechta?", difficulty: "easy", order: 3, videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", videoType: "youtube", tags: ["Qo'shish", "Matn masala"], estimatedMinutes: 3, solution: [{ stepNumber: 1, text: "34 + 28 = 62" }] },
  { id: "p-03-1", topicId: "topic-03", content: "$$85 - 42 = ?$$", difficulty: "easy", order: 1, videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", videoType: "youtube", tags: ["Ayirish"], estimatedMinutes: 2, solution: [{ stepNumber: 1, text: "Javob: 43" }] },
  { id: "p-03-2", topicId: "topic-03", content: "$$300 - 156 = ?$$", difficulty: "medium", order: 2, videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", videoType: "youtube", tags: ["Ayirish"], estimatedMinutes: 3, solution: [{ stepNumber: 1, text: "Javob: 144" }] },
  { id: "p-03-3", topicId: "topic-03", content: "Do'konda 500 so'm. 235 so'mlik non oldim. Qoldiq?", difficulty: "easy", order: 3, videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", videoType: "youtube", tags: ["Ayirish", "Matn masala"], estimatedMinutes: 2, solution: [{ stepNumber: 1, text: "500 - 235 = 265 so'm" }] },
  { id: "p-04-1", topicId: "topic-04", content: "$$7 \\times 8 = ?$$", difficulty: "easy", order: 1, videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", videoType: "youtube", tags: ["Ko'paytirish"], estimatedMinutes: 1, solution: [{ stepNumber: 1, text: "7 × 8 = 56" }] },
  { id: "p-04-2", topicId: "topic-04", content: "$$12 \\times 15 = ?$$", difficulty: "medium", order: 2, videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", videoType: "youtube", tags: ["Ko'paytirish"], estimatedMinutes: 4, solution: [{ stepNumber: 1, text: "12×15 = 180" }] },
  { id: "p-04-3", topicId: "topic-04", content: "Har qutida 6 ruchka, 9 quti. Jami?", difficulty: "easy", order: 3, videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", videoType: "youtube", tags: ["Ko'paytirish", "Matn masala"], estimatedMinutes: 2, solution: [{ stepNumber: 1, text: "6 × 9 = 54" }] },
  { id: "p-05-1", topicId: "topic-05", content: "$$72 \\div 8 = ?$$", difficulty: "easy", order: 1, videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", videoType: "youtube", tags: ["Bo'lish"], estimatedMinutes: 2, solution: [{ stepNumber: 1, text: "72 ÷ 8 = 9" }] },
  { id: "p-05-2", topicId: "topic-05", content: "$$100 \\div 7 = ?$$ (qoldiqli)", difficulty: "medium", order: 2, videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", videoType: "youtube", tags: ["Bo'lish", "Qoldiq"], estimatedMinutes: 3, solution: [{ stepNumber: 1, text: "14 qoldiq 2" }] },
  { id: "p-05-3", topicId: "topic-05", content: "45 konfet, 5 bola. Har biriga?", difficulty: "easy", order: 3, videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", videoType: "youtube", tags: ["Bo'lish", "Matn masala"], estimatedMinutes: 2, solution: [{ stepNumber: 1, text: "45 ÷ 5 = 9" }] },
  { id: "p-06-1", topicId: "topic-06", content: "$$\\frac{2}{5} + \\frac{1}{5} = ?$$", difficulty: "easy", order: 1, videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", videoType: "youtube", tags: ["Kasrlar"], estimatedMinutes: 3, solution: [{ stepNumber: 1, text: "3/5" }] },
  { id: "p-06-2", topicId: "topic-06", content: "$$\\frac{3}{4}$$ va $$\\frac{2}{3}$$ — qaysi katta?", difficulty: "medium", order: 2, videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", videoType: "youtube", tags: ["Kasrlar"], estimatedMinutes: 4, solution: [{ stepNumber: 1, text: "3/4 = 9/12 > 8/12 = 2/3" }] },
  { id: "p-06-3", topicId: "topic-06", content: "$$\\frac{12}{18}$$ ni qisqartiring.", difficulty: "hard", order: 3, videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", videoType: "youtube", tags: ["Kasrlar"], estimatedMinutes: 3, solution: [{ stepNumber: 1, text: "12/18 = 2/3" }] },
  { id: "p-07-1", topicId: "topic-07", content: "$$3.5 + 2.7 = ?$$", difficulty: "easy", order: 1, videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", videoType: "youtube", tags: ["O'nli kasrlar"], estimatedMinutes: 2, solution: [{ stepNumber: 1, text: "6.2" }] },
  { id: "p-07-2", topicId: "topic-07", content: "$$10.0 - 4.35 = ?$$", difficulty: "medium", order: 2, videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", videoType: "youtube", tags: ["O'nli kasrlar"], estimatedMinutes: 3, solution: [{ stepNumber: 1, text: "5.65" }] },
  { id: "p-08-1", topicId: "topic-08", content: "To'rtburchak tomonlari 5 va 8 sm. P = ?", difficulty: "easy", order: 1, videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", videoType: "youtube", tags: ["Geometriya"], estimatedMinutes: 3, solution: [{ stepNumber: 1, text: "P = 2(5+8) = 26 sm" }] },
  { id: "p-08-2", topicId: "topic-08", content: "Kvadrat P=32 sm. Yuzasi?", difficulty: "medium", order: 2, videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", videoType: "youtube", tags: ["Geometriya"], estimatedMinutes: 4, solution: [{ stepNumber: 1, text: "a=8, S=64 sm²" }] },
  { id: "p-08-3", topicId: "topic-08", content: "Doira r=7 sm. S=? (π≈3.14)", difficulty: "hard", order: 3, videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", videoType: "youtube", tags: ["Geometriya"], estimatedMinutes: 5, solution: [{ stepNumber: 1, text: "S = 3.14×49 = 153.86 sm²" }] },
  { id: "p-09-1", topicId: "topic-09", content: "$$x + 15 = 42$$", difficulty: "easy", order: 1, videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", videoType: "youtube", tags: ["Tenglamalar"], estimatedMinutes: 2, solution: [{ stepNumber: 1, text: "x = 27" }] },
  { id: "p-09-2", topicId: "topic-09", content: "$$3x + 12 = 36$$", difficulty: "medium", order: 2, videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", videoType: "youtube", tags: ["Tenglamalar"], estimatedMinutes: 4, solution: [{ stepNumber: 1, text: "x = 8" }] },
  { id: "p-09-3", topicId: "topic-09", content: "$$5(x-2) = 30$$", difficulty: "hard", order: 3, videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", videoType: "youtube", tags: ["Tenglamalar"], estimatedMinutes: 5, solution: [{ stepNumber: 1, text: "x = 8" }] },
  { id: "p-10-1", topicId: "topic-10", content: "Avtobusda 45 kishi. 12 tushdi, 8 chiqdi. Nechta qoldi?", difficulty: "easy", order: 1, videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", videoType: "youtube", tags: ["Matn masala"], estimatedMinutes: 3, solution: [{ stepNumber: 1, text: "45-12+8 = 41" }] },
  { id: "p-10-2", topicId: "topic-10", content: "Kitob 35000 so'm, 20% chegirma. Yangi narx?", difficulty: "medium", order: 2, videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", videoType: "youtube", tags: ["Matn masala", "Foiz"], estimatedMinutes: 4, solution: [{ stepNumber: 1, text: "35000 - 7000 = 28000 so'm" }] },
  { id: "p-10-3", topicId: "topic-10", content: "Ikki son yig'indisi 56, farqi 12. Topish.", difficulty: "hard", order: 3, videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", videoType: "youtube", tags: ["Matn masala"], estimatedMinutes: 5, solution: [{ stepNumber: 1, text: "34 va 22" }] },
];

const demoTest = {
  id: "test-demo-01",
  courseId: COURSE_ID,
  title: "Arifmetika asoslari — Oraliq test",
  description: "1-5 mavzular bo'yicha bilimlarni tekshirish",
  version: "Published",
  status: "published",
  gradeLevel: "Primary 3-5",
  subject: "Matematika",
  passingScore: 14,
  shuffleQuestions: true,
  totalPoints: 45,
  totalTime: 20,
  afterTopicOrder: 5,
  questions: [
    { id: "q1", type: "multiple_choice", content: "23 + 45 = ?", options: [{ label: "A", text: "58" }, { label: "B", text: "68" }, { label: "C", text: "78" }, { label: "D", text: "63" }], correctAnswer: "B", points: 5, estimatedMinutes: 1, difficulty: "easy", tags: ["Qo'shish"] },
    { id: "q2", type: "multiple_choice", content: "100 - 37 = ?", options: [{ label: "A", text: "73" }, { label: "B", text: "63" }, { label: "C", text: "67" }, { label: "D", text: "57" }], correctAnswer: "B", points: 5, estimatedMinutes: 1, difficulty: "easy", tags: ["Ayirish"] },
    { id: "q3", type: "multiple_choice", content: "7 × 8 = ?", options: [{ label: "A", text: "54" }, { label: "B", text: "56" }, { label: "C", text: "48" }, { label: "D", text: "64" }], correctAnswer: "B", points: 5, estimatedMinutes: 1, difficulty: "easy", tags: ["Ko'paytirish"] },
    { id: "q4", type: "multiple_choice", content: "72 ÷ 9 = ?", options: [{ label: "A", text: "7" }, { label: "B", text: "8" }, { label: "C", text: "9" }, { label: "D", text: "6" }], correctAnswer: "B", points: 5, estimatedMinutes: 1, difficulty: "easy", tags: ["Bo'lish"] },
    { id: "q5", type: "multiple_choice", content: "156 + 287 = ?", options: [{ label: "A", text: "433" }, { label: "B", text: "443" }, { label: "C", text: "343" }, { label: "D", text: "453" }], correctAnswer: "B", points: 10, estimatedMinutes: 2, difficulty: "medium", tags: ["Qo'shish"] },
    { id: "q6", type: "true_false", content: "25 × 4 = 100", options: [{ label: "A", text: "True" }, { label: "B", text: "False" }], correctAnswer: "A", points: 5, estimatedMinutes: 1, difficulty: "easy", tags: ["Ko'paytirish"] },
    { id: "q7", type: "multiple_choice", content: "10-20 orasidagi tub son?", options: [{ label: "A", text: "12" }, { label: "B", text: "15" }, { label: "C", text: "17" }, { label: "D", text: "18" }], correctAnswer: "C", points: 10, estimatedMinutes: 2, difficulty: "medium", tags: ["Sonlar"] },
  ],
  createdAt: now,
  updatedAt: now,
  createdBy: ADMIN_ID,
};

// ============================================================
// SEED
// ============================================================
async function seed() {
  console.log("🌱 EduKids — Demo kursni Firestore ga yozish...");
  console.log(`   Project: ${firebaseConfig.projectId}\n`);

  try {
    // 1. Course
    await setDoc(doc(db, "courses", COURSE_ID), course);
    console.log(`✅ Kurs: "${course.title}"`);

    // 2. Topics
    const topicBatch = writeBatch(db);
    for (const t of topics) {
      topicBatch.set(doc(db, "courses", COURSE_ID, "topics", t.id), { ...t, courseId: COURSE_ID, createdAt: now, updatedAt: now });
    }
    await topicBatch.commit();
    console.log(`✅ ${topics.length} ta mavzu`);

    // 3. Problems (30 ta — batch limit 500 dan kam)
    const batch2 = writeBatch(db);
    for (const p of problems) {
      batch2.set(doc(db, "courses", COURSE_ID, "topics", p.topicId, "problems", p.id), { ...p, courseId: COURSE_ID, createdAt: now });
    }
    await batch2.commit();
    console.log(`✅ ${problems.length} ta misol`);

    // 4. Test
    await setDoc(doc(db, "courses", COURSE_ID, "tests", demoTest.id), demoTest);
    console.log(`✅ Test: "${demoTest.title}"`);

    // 5. Admin
    await setDoc(doc(db, "users", ADMIN_ID), { id: ADMIN_ID, phone: "+998901234567", name: "Javohir Toshpulatov", role: "admin", createdAt: now, updatedAt: now });
    console.log(`✅ Admin yaratildi`);

    console.log("\n🎉 Tayyor! Firebase Console da tekshiring.");
    process.exit(0);
  } catch (error) {
    console.error("❌ Xatolik:", error.message || error);
    console.error("\n💡 Yechim: Firebase Console > Firestore > Rules da:");
    console.error('   allow read, write: if true;');
    console.error("   yozing va Publish bosing.\n");
    process.exit(1);
  }
}

seed();
