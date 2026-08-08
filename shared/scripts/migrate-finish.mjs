/**
 * EduKids — Migratsiyani YAKUNLASH skripti
 * ==========================================
 *
 * Asosiy `migrate.mjs` bajarmagan ishlarni tugatadi:
 *
 *  1. settings-ga asoslangan kolleksiyalar (kod shu joydan o'qiydi):
 *       Firestore testLibrary            -> settings['testLibrary']            (56 test)
 *       Firestore testBuilderQuestions   -> settings['testBuilderQuestions']   (44 savol)
 *       Firestore testBuilderFolders     -> settings['testBuilderFolders']     (8 papka)
 *       Firestore studentNotifications   -> settings['studentNotifications']   (4 bildirishnoma)
 *  2. userDevices -> user_devices (FK muammosi tufayli o'tmagan)
 *  3. FK tufayli tushib qolgan yozuvlarni qayta urinish (progress, favorites,
 *     user_activity, testResults) — yetim havolalar xavfsiz tozalanadi.
 *  4. Firebase da mavjud bo'lmagan, seed skript qo'shgan dublikatlarni olib tashlash.
 *  5. Foydalanuvchi profillarini Firestore dagi asl qiymatlar bilan sinxronlash
 *     (ism, telefon, rol, avatar, ban holati).
 *
 * Ishlatish:
 *   node shared/scripts/migrate-finish.mjs           (o'zgartiradi)
 *   node shared/scripts/migrate-finish.mjs --dry-run (faqat ko'rsatadi)
 */

import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { readFileSync } from "fs";
import crypto from "crypto";
import admin from "firebase-admin";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../../.env") });

const DRY = process.argv.includes("--dry-run");

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceKey) {
  console.error("VITE_SUPABASE_URL va SUPABASE_SERVICE_ROLE_KEY .env da bo'lishi kerak");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const sa = JSON.parse(readFileSync(resolve(__dirname, "../../firebase-service-account.json"), "utf8"));
admin.initializeApp({
  credential: admin.credential.cert(sa),
  storageBucket: `${sa.project_id}.firebasestorage.app`,
});
const db = admin.firestore();

// ---------------------------------------------------------------- yordamchilar

const PROJECT_REF = supabaseUrl.split("//")[1].split(".")[0];

/** Firebase UID -> Postgres UUID (client dagi stringToUUID bilan AYNAN bir xil) */
const UUID_SHAPE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function stringToUUID(str) {
  if (!str) return null;
  if (str === "admin") str = "admin-001";
  if (UUID_SHAPE.test(str)) return str.toLowerCase();
  const h = crypto.createHash("md5").update(str).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

const camelToSnake = (s) =>
  s === "totalXP" ? "total_xp" : s === "testXP" ? "test_xp" : s.replace(/[A-Z]/g, (l) => `_${l.toLowerCase()}`);

/** Kirillchani lotinga + Supabase Storage kaliti uchun xavfsiz shakl (migrate.mjs bilan bir xil) */
function safeKey(path) {
  const map = {
    А: "A", а: "a", Б: "B", б: "b", В: "V", в: "v", Г: "G", г: "g", Д: "D", д: "d",
    Е: "E", е: "e", Ё: "Yo", ё: "yo", Ж: "Zh", ж: "zh", З: "Z", з: "z", И: "I", и: "i",
    Й: "Y", й: "y", К: "K", к: "k", Л: "L", л: "l", М: "M", м: "m", Н: "N", н: "n",
    О: "O", о: "o", П: "P", п: "p", Р: "R", р: "r", С: "S", с: "s", Т: "T", т: "t",
    У: "U", у: "u", Ф: "F", ф: "f", Х: "Kh", х: "kh", Ц: "Ts", ц: "ts", Ч: "Ch", ч: "ch",
    Ш: "Sh", ш: "sh", Щ: "Shch", щ: "shch", Ъ: "", ъ: "", Ы: "Y", ы: "y", Ь: "", ь: "",
    Э: "E", э: "e", Ю: "Yu", ю: "yu", Я: "Ya", я: "ya",
  };
  let clean = path.split("").map((ch) => map[ch] ?? ch).join("");
  clean = clean.replace(/[^\x00-\x7F]/g, "_");
  return clean.split("/").map((seg) => encodeURIComponent(seg)).join("/");
}

/** Firebase Storage URL -> Supabase Storage URL */
function translateUrl(value) {
  if (typeof value !== "string") return value;
  if (!value.includes("firebasestorage.googleapis.com")) return value;
  const m = value.match(/\/o\/([^?#]+)/);
  if (!m) return value;
  const decoded = decodeURIComponent(m[1]);
  return `https://${PROJECT_REF}.supabase.co/storage/v1/object/public/edukids/${safeKey(decoded)}`;
}

/** Ichma-ich obyekt/massivdagi barcha URL larni tarjima qilish (kalitlar o'zgarmaydi) */
function deepTranslate(v) {
  if (v === null || v === undefined) return v;
  if (typeof v === "string") return translateUrl(v);
  if (Array.isArray(v)) return v.map(deepTranslate);
  if (typeof v === "object") {
    const out = {};
    for (const [k, val] of Object.entries(v)) out[k] = deepTranslate(val);
    return out;
  }
  return v;
}

const USER_ID_FIELDS = new Set(["userId", "fromUserId", "toUserId", "createdBy"]);

/** Firestore hujjatini Postgres qatoriga aylantirish (top-level snake_case) */
function toRow(data) {
  const row = {};
  for (const [k, v] of Object.entries(data)) {
    const key = camelToSnake(k);
    row[key] = USER_ID_FIELDS.has(k) ? stringToUUID(v) : deepTranslate(v);
  }
  return row;
}

let changes = 0;
const log = (...a) => console.log(...a);
const step = (t) => log(`\n${"=".repeat(64)}\n${t}\n${"=".repeat(64)}`);

async function upsertSettings(key, value, count) {
  log(`  ${key}: ${count} element`);
  if (DRY) return;
  const { error } = await supabase.from("settings").upsert({ key, value });
  if (error) log(`    XATO: ${error.message}`);
  else { log(`    saqlandi`); changes++; }
}

// ------------------------------------------------- 1. settings-based kolleksiyalar

async function migrateSettingsCollections() {
  step("1. settings-ga asoslangan kolleksiyalar (test kutubxonasi, TestBuilder, bildirishnomalar)");

  // testLibrary — kod getAllLibraryTests() orqali settings['testLibrary'] dan o'qiydi
  const tl = await db.collection("testLibrary").get();
  const tlArr = tl.docs.map((d) => deepTranslate({ id: d.id, ...d.data() }));
  await upsertSettings("testLibrary", tlArr, tlArr.length);

  // testBuilderQuestions
  const tbq = await db.collection("testBuilderQuestions").get();
  const tbqArr = tbq.docs.map((d) => deepTranslate({ id: d.id, ...d.data() }));
  await upsertSettings("testBuilderQuestions", tbqArr, tbqArr.length);

  // testBuilderFolders
  const tbf = await db.collection("testBuilderFolders").get();
  const tbfArr = tbf.docs.map((d) => deepTranslate({ id: d.id, ...d.data() }));
  await upsertSettings("testBuilderFolders", tbfArr, tbfArr.length);

  // studentNotifications — userId lar UUID ga map qilinadi (client user.uid bilan solishtiradi)
  const sn = await db.collection("studentNotifications").get();
  const snArr = sn.docs.map((d) => {
    const x = deepTranslate({ id: d.id, ...d.data() });
    if (x.userId) x.userId = stringToUUID(x.userId);
    return x;
  });
  await upsertSettings("studentNotifications", snArr, snArr.length);
}

// ------------------------------------------------- 2. user_devices

async function migrateUserDevices() {
  step("2. userDevices -> user_devices");

  const { data: profiles } = await supabase.from("users").select("id");
  const known = new Set((profiles || []).map((p) => p.id));

  const snap = await db.collection("userDevices").get();
  log(`  Firestore: ${snap.size} qurilma`);

  for (const d of snap.docs) {
    const x = d.data();
    const userUuid = stringToUUID(x.userId);
    const deviceId = x.id; // Firestore da `id` maydoni = deviceId
    const rowId = `${userUuid}_${deviceId}`;

    if (!known.has(userUuid)) {
      log(`  o'tkazib yuborildi (profil yo'q): ${d.id}`);
      continue;
    }

    const row = {
      id: rowId,
      device_id: deviceId,
      user_id: userUuid,
      device_name: x.deviceName || "Noma'lum",
      last_seen: Number(x.lastSeen) || Date.now(),
      created_at: Number(x.createdAt) || Date.now(),
      is_active: x.isActive !== false,
    };

    if (DRY) { log(`  [dry] ${rowId}`); continue; }
    const { error } = await supabase.from("user_devices").upsert(row);
    if (error) log(`  XATO ${rowId}: ${error.message}`);
    else { log(`  OK ${rowId}`); changes++; }
  }
}

// ------------------------------------------------- 3. FK tufayli tushib qolganlar

async function retryFkSkipped() {
  step("3. FK tufayli tushib qolgan yozuvlarni qayta urinish");

  const [{ data: cs }, { data: ts }, { data: tps }, { data: us }] = await Promise.all([
    supabase.from("courses").select("id"),
    supabase.from("tests").select("id"),
    supabase.from("topics").select("id"),
    supabase.from("users").select("id"),
  ]);
  const courseIds = new Set((cs || []).map((x) => x.id));
  const testIds = new Set((ts || []).map((x) => x.id));
  const topicIds = new Set((tps || []).map((x) => x.id));
  const userIds = new Set((us || []).map((x) => x.id));

  // --- user_progress ---
  log("\n  -- progress -> user_progress --");
  const prog = await db.collection("progress").get();
  for (const d of prog.docs) {
    const x = d.data();
    const userUuid = stringToUUID(x.userId);
    const rowId = `${userUuid}_${x.courseId}`;

    if (!courseIds.has(x.courseId)) {
      log(`  TASHLANDI (kurs "${x.courseId}" Firebase da ham o'chirilgan): ${d.id}`);
      continue;
    }
    if (!userIds.has(userUuid)) { log(`  TASHLANDI (foydalanuvchi yo'q): ${d.id}`); continue; }

    const row = toRow(x);
    row.id = rowId;
    row.user_id = userUuid;
    if (DRY) { log(`  [dry] ${rowId}`); continue; }
    const { error } = await supabase.from("user_progress").upsert(row);
    if (error) log(`  XATO ${rowId}: ${error.message}`);
    else changes++;
  }
  log(`  user_progress tugadi`);

  // --- favorites ---
  log("\n  -- favorites --");
  const fav = await db.collection("favorites").get();
  for (const d of fav.docs) {
    const x = d.data();
    const userUuid = stringToUUID(x.userId);
    const rowId = `${userUuid}_${x.topicId}`;
    if (!topicIds.has(x.topicId) || !courseIds.has(x.courseId)) {
      log(`  TASHLANDI (mavzu/kurs o'chirilgan): ${d.id}`);
      continue;
    }
    if (!userIds.has(userUuid)) { log(`  TASHLANDI (foydalanuvchi yo'q): ${d.id}`); continue; }
    const row = toRow(x);
    row.id = rowId;
    row.user_id = userUuid;
    if (DRY) { log(`  [dry] ${rowId}`); continue; }
    const { error } = await supabase.from("favorites").upsert(row);
    if (error) log(`  XATO ${rowId}: ${error.message}`);
    else changes++;
  }

  // --- user_activity ---
  log("\n  -- userActivity -> user_activity --");
  const ua = await db.collection("userActivity").get();
  for (const d of ua.docs) {
    const x = d.data();
    const userUuid = stringToUUID(x.userId);
    const rowId = `${userUuid}_${x.date}`;
    if (!userIds.has(userUuid)) { log(`  TASHLANDI (foydalanuvchi yo'q): ${d.id}`); continue; }
    const row = toRow(x);
    row.id = rowId;
    row.user_id = userUuid;
    if (DRY) { log(`  [dry] ${rowId}`); continue; }
    const { error } = await supabase.from("user_activity").upsert(row);
    if (error) log(`  XATO ${rowId}: ${error.message}`);
    else changes++;
  }

  // --- test_results ---
  // Eslatma: test_id -> tests(id) FK bor. Firebase da o'chirilgan testlarga
  // ishora qiluvchi natijalarni test_id=null bilan saqlaymiz — natija tarixi
  // (ball, sana, javoblar) yo'qolmaydi, lekin FK buzilmaydi.
  log("\n  -- testResults -> test_results --");
  const tr = await db.collection("testResults").get();
  for (const d of tr.docs) {
    const x = d.data();
    const userUuid = stringToUUID(x.userId);
    if (!userIds.has(userUuid)) { log(`  TASHLANDI (foydalanuvchi yo'q): ${d.id}`); continue; }
    if (!courseIds.has(x.courseId)) {
      log(`  TASHLANDI (kurs "${x.courseId}" o'chirilgan): ${d.id}`);
      continue;
    }
    const row = toRow(x);
    row.id = d.id;
    row.user_id = userUuid;
    if (!testIds.has(x.testId)) {
      row.test_id = null; // o'chirilgan test — tarix saqlanadi
      log(`  test_id=null qilindi (test "${x.testId}" o'chirilgan): ${d.id}`);
    }
    if (DRY) continue;
    const { error } = await supabase.from("test_results").upsert(row);
    if (error) log(`  XATO ${d.id}: ${error.message}`);
    else changes++;
  }
}

// ------------------------------------------------- 4. dublikatlarni tozalash

async function cleanSeedDuplicates() {
  step("4. Firebase da mavjud bo'lmagan (seed skript qo'shgan) yozuvlarni tozalash");

  // social_links: Firebase root + course linklar
  const fbRoot = await db.collection("socialLinks").get();
  const fbIds = new Set(fbRoot.docs.map((d) => d.id));
  const courses = await db.collection("courses").get();
  for (const c of courses.docs) {
    const sl = await c.ref.collection("socialLinks").get();
    sl.docs.forEach((d) => fbIds.add(d.id));
  }

  const { data: sbSL } = await supabase.from("social_links").select("id, platform, course_id");
  const extraSL = (sbSL || []).filter((s) => !fbIds.has(s.id));
  log(`\n  social_links — Firebase da yo'q: ${extraSL.length}`);
  for (const s of extraSL) {
    log(`    o'chirildi: ${s.id} (${s.platform})`);
    if (!DRY) {
      const { error } = await supabase.from("social_links").delete().eq("id", s.id);
      if (error) log(`      XATO: ${error.message}`);
      else changes++;
    }
  }

  // categories
  const fbCats = await db.collection("categories").get();
  const fbCatIds = new Set(fbCats.docs.map((d) => d.id));
  const { data: sbCats } = await supabase.from("categories").select("id, name");
  const extraCats = (sbCats || []).filter((c) => !fbCatIds.has(c.id));
  log(`\n  categories — Firebase da yo'q: ${extraCats.length}`);
  for (const c of extraCats) {
    // Kurslar bu kategoriya nomini ishlatayotgan bo'lsa saqlab qolamiz
    const { count } = await supabase
      .from("courses")
      .select("*", { count: "exact", head: true })
      .eq("category", c.name);
    if (count && count > 0) {
      log(`    SAQLANDI: ${c.id} (${c.name}) — ${count} kurs ishlatmoqda`);
      continue;
    }
    log(`    o'chirildi: ${c.id} (${c.name})`);
    if (!DRY) {
      const { error } = await supabase.from("categories").delete().eq("id", c.id);
      if (error) log(`      XATO: ${error.message}`);
      else changes++;
    }
  }

  // motivational_phrases
  const fbMot = await db.collection("motivations").get();
  const fbMotIds = new Set(fbMot.docs.map((d) => d.id));
  const { data: sbMot } = await supabase.from("motivational_phrases").select("id, placement, text");
  const extraMot = (sbMot || []).filter((m) => !fbMotIds.has(m.id));
  log(`\n  motivational_phrases — Firebase da yo'q: ${extraMot.length}`);
  for (const m of extraMot) {
    log(`    o'chirildi: ${m.id} [${m.placement}] "${String(m.text).slice(0, 40)}"`);
    if (!DRY) {
      const { error } = await supabase.from("motivational_phrases").delete().eq("id", m.id);
      if (error) log(`      XATO: ${error.message}`);
      else changes++;
    }
  }

  // users: Firebase da (Firestore users YOKI users.json da) bo'lmagan profillar
  const fbUsers = await db.collection("users").get();
  const validUuids = new Set(fbUsers.docs.map((d) => stringToUUID(d.id)));
  try {
    const uj = JSON.parse(readFileSync(resolve(__dirname, "../../users.json"), "utf8"));
    for (const a of uj.users || []) validUuids.add(stringToUUID(a.localId));
  } catch { /* users.json yo'q */ }

  const { data: sbUsers } = await supabase.from("users").select("id, name, phone, role");
  const extraUsers = (sbUsers || []).filter((u) => !validUuids.has(u.id));
  log(`\n  users — Firebase da yo'q: ${extraUsers.length}`);
  for (const u of extraUsers) {
    log(`    ${u.id} (${u.name}, ${u.phone}, ${u.role}) — bog'liq ma'lumot borligi uchun O'CHIRILMAYDI`);
  }
}

// ------------------------------------------------- 5. profillarni sinxronlash

async function syncUserProfiles() {
  step("5. Foydalanuvchi profillarini Firestore dagi asl qiymatlar bilan sinxronlash");

  const fbUsers = await db.collection("users").get();
  for (const d of fbUsers.docs) {
    const x = d.data();
    const uuid = stringToUUID(d.id);

    const row = {
      id: uuid,
      phone: x.phone || "",
      name: x.name || "O'quvchi",
      role: x.role === "admin" ? "admin" : "student",
      avatar: translateUrl(x.avatar) || null,
      grade: x.grade || null,
      is_banned: x.isBanned === true,
      banned_at: x.bannedAt ?? null,
      created_at: Number(x.createdAt) || Date.now(),
      updated_at: Number(x.updatedAt) || Date.now(),
    };

    log(`  ${d.id} -> ${uuid}  name="${row.name}" role=${row.role} avatar=${row.avatar ? "bor" : "yo'q"}`);
    if (DRY) continue;
    const { error } = await supabase.from("users").upsert(row);
    if (error) log(`    XATO: ${error.message}`);
    else changes++;
  }
}

// ------------------------------------------------- yakuniy tekshiruv

async function verify() {
  step("YAKUNIY TEKSHIRUV");

  const pairs = [
    ["users", "users"], ["categories", "categories"], ["courses", "courses"],
    ["newsItems", "news_items"], ["motivations", "motivational_phrases"],
    ["motivationSettings", "motivation_settings"], ["promoCodes", "promo_codes"],
    ["homeBanners", "home_banners"], ["testimonials", "testimonials"],
    ["certificates", "certificates"], ["progress", "user_progress"],
    ["testResults", "test_results"], ["subscriptions", "subscriptions"],
    ["payments", "payments"], ["messages", "messages"], ["favorites", "favorites"],
    ["userActivity", "user_activity"], ["userDevices", "user_devices"],
  ];

  for (const [fc, st] of pairs) {
    const snap = await db.collection(fc).get();
    const { count } = await supabase.from(st).select("*", { count: "exact", head: true });
    const mark = (count ?? 0) >= snap.size ? "OK  " : "KAM ";
    log(`  ${mark} ${fc.padEnd(20)} FB=${String(snap.size).padEnd(4)} SB=${count ?? 0}`);
  }

  for (const key of ["testLibrary", "testBuilderQuestions", "testBuilderFolders", "studentNotifications"]) {
    const snap = await db.collection(key).get();
    const { data } = await supabase.from("settings").select("value").eq("key", key).maybeSingle();
    const len = Array.isArray(data?.value) ? data.value.length : 0;
    const mark = len >= snap.size ? "OK  " : "KAM ";
    log(`  ${mark} ${key.padEnd(20)} FB=${String(snap.size).padEnd(4)} settings=${len}`);
  }
}

async function main() {
  log(`EduKids — migratsiyani yakunlash${DRY ? "  [DRY-RUN: hech narsa o'zgarmaydi]" : ""}`);
  await migrateSettingsCollections();
  await migrateUserDevices();
  await retryFkSkipped();
  await cleanSeedDuplicates();
  await syncUserProfiles();
  await verify();
  log(`\n${DRY ? "DRY-RUN tugadi." : `TUGADI. ${changes} ta o'zgarish qilindi.`}`);
  process.exit(0);
}

main().catch((e) => {
  console.error("\nKRITIK XATO:", e);
  process.exit(1);
});
