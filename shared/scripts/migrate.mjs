/**
 * EduKids 2 — Firebase to Supabase Migration Script
 * 
 * Migrates:
 * 1. Auth Users (using users.json) with deterministic UUID mapping and default password.
 *    - Guarantees profile records exist in public.users to prevent FK violations.
 * 2. Firestore data in custom order to respect relational integrity and foreign keys.
 *    - Automatically translates Firestore camelCase to PostgreSQL snake_case.
 *    - Maps any user ID reference field (localId, userId, fromUserId, toUserId, createdBy) to the new UUIDs.
 *    - Custom row mapping for composite key tables (user_devices, user_progress, favorites, user_activity, certificates).
 *    - Custom row mapping for settings (key, value).
 *    - Automatically converts Firebase Storage URLs to Supabase CDN URLs.
 * 3. Storage assets (all files in Firebase Storage bucket downloaded and uploaded to Supabase Storage 'edukids' bucket).
 *    - Handles non-ASCII file paths (sanitization/URL encoding) to prevent 'Invalid key' errors.
 * 
 * Run with: node shared/scripts/migrate.mjs
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

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Error: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env");
  process.exit(1);
}

// 1. Initialize Supabase Admin Client
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

// 2. Initialize Firebase Admin SDK
let firebaseApp;
try {
  const serviceAccount = JSON.parse(
    readFileSync(resolve(__dirname, "../../firebase-service-account.json"), "utf8")
  );
  firebaseApp = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: `${serviceAccount.project_id}.firebasestorage.app`
  });
  console.log(`✅ Firebase Admin initialized. Project: ${serviceAccount.project_id}`);
} catch (err) {
  console.error("❌ Error initializing Firebase Admin. Make sure firebase-service-account.json is in root.", err.message);
  process.exit(1);
}

const db = admin.firestore();
const bucket = admin.storage().bucket();

const DEFAULT_PASSWORD = "edukids123";
const firebaseUserIds = new Set(['admin-001']);

// Helper: Deterministically map string IDs (like Firebase UID) to PostgreSQL UUID
function stringToUUID(str) {
  if (!str) return null;
  if (str === 'admin') str = 'admin-001'; // Map generic 'admin' reference to the actual admin profile 'admin-001'
  
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(str)) return str.toLowerCase();
  
  if (firebaseUserIds.has(str)) {
    const hash = crypto.createHash('md5').update(str).digest('hex');
    return `${hash.substring(0, 8)}-${hash.substring(8, 12)}-${hash.substring(12, 16)}-${hash.substring(16, 20)}-${hash.substring(20, 32)}`;
  }
  
  return str;
}

// Helper: Translate camelCase to snake_case
function camelToSnake(str) {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

function keyMapper(key) {
  if (key === 'totalXP') return 'total_xp';
  if (key === 'testXP') return 'test_xp';
  return camelToSnake(key);
}

// Helper: Transliterate Cyrillic and replace unsafe characters for Supabase Storage keys
function safeKey(path) {
  const cyrillicToLatin = {
    'А': 'A', 'а': 'a', 'Б': 'B', 'б': 'b', 'В': 'V', 'в': 'v', 'Г': 'G', 'г': 'g',
    'Д': 'D', 'д': 'd', 'Е': 'E', 'е': 'e', 'Ё': 'Yo', 'ё': 'yo', 'Ж': 'Zh', 'ж': 'zh',
    'З': 'Z', 'з': 'z', 'И': 'I', 'и': 'i', 'Й': 'Y', 'й': 'y', 'К': 'K', 'к': 'k',
    'Л': 'L', 'л': 'l', 'М': 'M', 'м': 'm', 'Н': 'N', 'н': 'n', 'О': 'O', 'о': 'o',
    'П': 'P', 'п': 'p', 'Р': 'R', 'р': 'r', 'С': 'S', 'с': 's', 'Т': 'T', 'т': 't',
    'У': 'U', 'у': 'u', 'Ф': 'F', 'ф': 'f', 'Х': 'Kh', 'х': 'kh', 'Ц': 'Ts', 'ц': 'ts',
    'Ч': 'Ch', 'ч': 'ch', 'Ш': 'Sh', 'ш': 'sh', 'Щ': 'Shch', 'щ': 'shch', 'Ъ': '', 'ъ': '',
    'Ы': 'Y', 'ы': 'y', 'Ь': '', 'ь': '', 'Э': 'E', 'э': 'e', 'Ю': 'Yu', 'ю': 'yu',
    'Я': 'Ya', 'я': 'ya'
  };
  
  let clean = path.split('').map(char => cyrillicToLatin[char] || char).join('');
  // Replace non-ASCII with underscores
  clean = clean.replace(/[^\x00-\x7F]/g, '_');
  // URL encode path segments
  return clean.split('/').map(segment => encodeURIComponent(segment)).join('/');
}

// Helper: Translate Firebase Storage URLs to Supabase Storage URLs
function translateUrl(value) {
  if (typeof value !== 'string') return value;
  if (value.includes('firebasestorage.googleapis.com')) {
    const match = value.match(/\/o\/([^?#]+)/);
    if (match) {
      const decodedPath = decodeURIComponent(match[1]);
      const projectRef = supabaseUrl.split('//')[1].split('.')[0];
      const encodedPath = safeKey(decodedPath);
      return `https://${projectRef}.supabase.co/storage/v1/object/public/edukids/${encodedPath}`;
    }
  }
  return value;
}


// Translate nested objects/arrays to keep camelCase (except URLs), but convert top-level to snake_case
function translateNestedValue(value) {
  if (!value) return value;
  if (typeof value === 'string') {
    return translateUrl(value);
  }
  if (Array.isArray(value)) {
    return value.map(item => translateNestedValue(item));
  }
  if (typeof value === 'object') {
    const clean = {};
    for (const [key, val] of Object.entries(value)) {
      clean[key] = translateNestedValue(val);
    }
    return clean;
  }
  return value;
}

// Known fields that contain user IDs across various tables
const USER_ID_FIELDS = new Set([
  'userId',
  'fromUserId',
  'toUserId',
  'createdBy',
  'user_id',
  'from_user_id',
  'to_user_id',
  'created_by'
]);

const FOREIGN_KEY_FIELDS = new Set([
  'courseId', 'folderId', 'topicId', 'subscriptionId', 'testId', 'problemId',
  'course_id', 'folder_id', 'topic_id', 'subscription_id', 'test_id', 'problem_id',
  'created_by', 'createdBy'
]);

function translateRow(docData, tableName, docId) {
  const row = {};

  // Custom mapping for user_devices
  if (tableName === 'user_devices') {
    const parts = docId.split('_');
    const userUuid = stringToUUID(parts[0]);
    const deviceId = parts[1];
    row['id'] = `${userUuid}_${deviceId}`;
    row['device_id'] = docData.id; // docData.id in Firestore is deviceId
  }
  
  // Custom mapping for user_progress
  else if (tableName === 'user_progress') {
    const parts = docId.split('_');
    const userUuid = stringToUUID(parts[0]);
    const courseId = parts[1];
    row['id'] = `${userUuid}_${courseId}`;
  }
  
  // Custom mapping for favorites
  else if (tableName === 'favorites') {
    const parts = docId.split('_');
    const userUuid = stringToUUID(parts[0]);
    const topicId = parts[1];
    row['id'] = `${userUuid}_${topicId}`;
  }
  
  // Custom mapping for user_activity
  else if (tableName === 'user_activity') {
    const parts = docId.split('_');
    const userUuid = stringToUUID(parts[0]);
    const dateStr = parts[1];
    row['id'] = `${userUuid}_${dateStr}`;
  }

  // Custom mapping for certificates
  else if (tableName === 'certificates') {
    const parts = docId.split('-');
    const userId = parts[1];
    const courseId = parts.slice(2).join('-');
    const userUuid = stringToUUID(userId);
    row['id'] = `cert-${userUuid}-${courseId}`;
  }

  // Custom mapping for settings
  else if (tableName === 'settings') {
    row['key'] = docId;
    row['value'] = translateNestedValue(docData);
    return row;
  }

  for (const [key, value] of Object.entries(docData)) {
    const snakeKey = keyMapper(key);
    
    // Skip id for tables that have custom id mapping already handled
    if (key === 'id' && ['user_devices', 'user_progress', 'favorites', 'user_activity', 'certificates'].includes(tableName)) {
      continue;
    }
    
    if (FOREIGN_KEY_FIELDS.has(key) && value === "") {
      row[snakeKey] = null;
      continue;
    }
    
    if (key === 'id') {
      if (tableName === 'users') {
        row[snakeKey] = stringToUUID(value);
      } else {
        row[snakeKey] = value;
      }
      continue;
    }
    
    if (USER_ID_FIELDS.has(key)) {
      row[snakeKey] = stringToUUID(value);
    } else {
      row[snakeKey] = translateNestedValue(value);
    }
  }

  
  if (!row['id'] && !['user_devices', 'user_progress', 'favorites', 'user_activity', 'certificates', 'settings'].includes(tableName)) {
    row['id'] = docId;
  }
  
  return row;
}

// ==========================================
// 1. MIGRATE AUTH USERS
// ==========================================
async function migrateAuthUsers() {
  console.log("\n🚀 Starting Auth Users Migration...");
  let usersData;
  try {
    usersData = JSON.parse(readFileSync(resolve(__dirname, "../../users.json"), "utf8"));
  } catch (err) {
    console.error("❌ Failed to read users.json. Run firebase auth:export first.", err.message);
    return;
  }

  const accounts = usersData.users || [];
  console.log(`Found ${accounts.length} users in users.json`);

  for (const account of accounts) {
    const newUid = stringToUUID(account.localId);
    console.log(`Migrating user: ${account.email} (${account.localId} -> ${newUid})`);

    // We check if user exists in Supabase first
    const { data: existingUser } = await supabase.auth.admin.getUserById(newUid);
    
    if (existingUser?.user) {
      console.log(`   User ${account.email} already exists in Supabase Auth.`);
    } else {
      const isPhoneUser = account.email.endsWith("@edukids.uz") && !account.email.startsWith("admin");
      const phoneNumber = isPhoneUser ? "+" + account.email.split("@")[0] : undefined;

      const { error } = await supabase.auth.admin.createUser({
        id: newUid,
        email: account.email,
        email_confirm: true,
        password: DEFAULT_PASSWORD,
        phone: phoneNumber,
        phone_confirm: isPhoneUser
      });

      if (error) {
        console.error(`   ❌ Error creating user ${account.email}:`, error.message);
      } else {
        console.log(`   ✅ Created user in Supabase Auth.`);
      }
    }

    // Always guarantee profile record in public.users to prevent FK violations
    const isPhoneUser = account.email.endsWith("@edukids.uz") && !account.email.startsWith("admin");
    const userProfile = {
      id: newUid,
      phone: isPhoneUser ? "+" + account.email.split("@")[0] : "+998901234567",
      name: isPhoneUser ? "O'quvchi" : "Admin",
      role: account.email.startsWith("admin") ? "admin" : "student",
      created_at: parseInt(account.createdAt) || Date.now(),
      updated_at: Date.now()
    };
    
    const { error: profileErr } = await supabase.from("users").upsert(userProfile);
    if (profileErr) {
      console.error(`   ❌ Error upserting default user profile for ${account.email}:`, profileErr.message);
    } else {
      console.log(`   ✅ Ensured user profile in public.users.`);
    }
  }
  console.log("✅ Auth Users Migration completed.");
}

// ==========================================
// 2. MIGRATE STORAGE ASSETS
// ==========================================
async function migrateStorage() {
  console.log("\n🚀 Starting Storage Assets Migration...");
  
  // Make sure 'edukids' bucket exists in Supabase
  const { data: buckets, error: listBucketsError } = await supabase.storage.listBuckets();
  if (listBucketsError) {
    console.error("❌ Failed to list Supabase buckets:", listBucketsError.message);
    return;
  }

  const bucketExists = buckets.some(b => b.name === 'edukids');
  if (!bucketExists) {
    console.log("Creating public 'edukids' bucket in Supabase...");
    const { error: createBucketError } = await supabase.storage.createBucket('edukids', {
      public: true
    });
    if (createBucketError) {
      console.error("❌ Failed to create bucket 'edukids':", createBucketError.message);
      return;
    }
    console.log("✅ Created public 'edukids' bucket.");
  } else {
    console.log("✅ Bucket 'edukids' already exists.");
  }

  console.log("Fetching files from Firebase Storage...");
  let files;
  try {
    [files] = await bucket.getFiles();
  } catch (err) {
    console.error("❌ Failed to list Firebase Storage files:", err.message);
    return;
  }

  console.log(`Found ${files.length} files in Firebase Storage.`);

  for (const file of files) {
    const destinationPath = file.name;
    if (destinationPath.endsWith('/') || !destinationPath) continue;

    // Use sanitization for path uploading
    const sanitizedKey = safeKey(destinationPath);
    console.log(`Migrating file: ${destinationPath} -> ${sanitizedKey}`);

    try {
      const [content] = await file.download();
      
      const { data, error } = await supabase.storage
        .from('edukids')
        .upload(sanitizedKey, content, {
          contentType: file.metadata.contentType || 'application/octet-stream',
          upsert: true
        });

      if (error) {
        console.error(`   ❌ Error uploading ${sanitizedKey}:`, error.message);
      } else {
        console.log(`   ✅ Migrated successfully.`);
      }
    } catch (err) {
      console.error(`   ❌ Error downloading/uploading ${destinationPath}:`, err.message);
    }
  }

  console.log("✅ Storage Assets Migration completed.");
}

// ==========================================
// 3. MIGRATE FIRESTORE DATA
// ==========================================
const migratedCourseIds = new Set();
const migratedFolderIds = new Set();
const migratedTopicIds = new Set();
const migratedTestIds = new Set();
const migratedProblemIds = new Set();

async function clearTable(tableName, idColumn = 'id') {
  console.log(`   Clearing table ${tableName}...`);
  const { error } = await supabase.from(tableName).delete().neq(idColumn, '_non_existent_id_');
  if (error) {
    console.warn(`   ⚠️ Warning: Could not clear table ${tableName}:`, error.message);
  }
}

// ==========================================
// 3. MIGRATE FIRESTORE DATA
// ==========================================
async function migrateCollection(collectionRef, supabaseTable, parentMap = null) {
  console.log(`   Fetching docs from Firestore collection/query for ${supabaseTable}...`);
  const snap = await collectionRef.get();
  console.log(`   Found ${snap.size} documents.`);

  for (const doc of snap.docs) {
    const docData = doc.data();
    
    // Parent values
    if (parentMap) {
      for (const [k, v] of Object.entries(parentMap)) {
        docData[k] = v;
      }
    }

    // Special handler: Check if this is the "users" table, ensure Auth user exists first
    if (supabaseTable === 'users') {
      const userUuid = stringToUUID(doc.id);
      const { data: existingUser } = await supabase.auth.admin.getUserById(userUuid);
      if (!existingUser?.user) {
        console.log(`      Creating missing Auth account for profile ${doc.id} (${docData.name || docData.phone})`);
        const mockEmail = docData.phone 
          ? docData.phone.replace(/[^0-9]/g, "") + "@edukids.uz" 
          : `user-${doc.id.toLowerCase()}@edukids.uz`;
        
        const { error: authErr } = await supabase.auth.admin.createUser({
          id: userUuid,
          email: mockEmail,
          email_confirm: true,
          password: DEFAULT_PASSWORD,
          phone: docData.phone || undefined,
          phone_confirm: !!docData.phone
        });
        if (authErr) {
          console.error(`      ❌ Error creating missing Auth account for ${doc.id}:`, authErr.message);
        }
      }
    }

    const row = translateRow(docData, supabaseTable, doc.id);

    // Skip orphaned entries that reference non-existent parents (to prevent FK errors)
    if (supabaseTable === 'folders' && !migratedCourseIds.has(row.course_id)) {
      console.log(`      ⚠️ Skipping orphaned folder ${doc.id} (course ${row.course_id} does not exist)`);
      continue;
    }
    if (supabaseTable === 'tests' && !migratedCourseIds.has(row.course_id)) {
      console.log(`      ⚠️ Skipping orphaned test ${doc.id} (course ${row.course_id} does not exist)`);
      continue;
    }
    if (supabaseTable === 'problems' && !migratedTopicIds.has(row.topic_id)) {
      console.log(`      ⚠️ Skipping orphaned problem ${doc.id} (topic ${row.topic_id} does not exist)`);
      continue;
    }
    if (supabaseTable === 'favorites') {
      if (!migratedCourseIds.has(row.course_id) || !migratedTopicIds.has(row.topic_id)) {
        console.log(`      ⚠️ Skipping orphaned favorite ${doc.id} (course ${row.course_id} or topic ${row.topic_id} does not exist)`);
        continue;
      }
    }
    if (supabaseTable === 'user_progress' && !migratedCourseIds.has(row.course_id)) {
      console.log(`      ⚠️ Skipping orphaned user progress ${doc.id} (course ${row.course_id} does not exist)`);
      continue;
    }
    if (supabaseTable === 'test_results') {
      if (!migratedCourseIds.has(row.course_id) || !migratedTestIds.has(row.test_id)) {
        console.log(`      ⚠️ Skipping orphaned test result ${doc.id} (course ${row.course_id} or test ${row.test_id} does not exist)`);
        continue;
      }
    }
    if (supabaseTable === 'subscriptions' && row.course_id && !migratedCourseIds.has(row.course_id)) {
      console.log(`      ⚠️ Skipping orphaned subscription ${doc.id} (course ${row.course_id} does not exist)`);
      continue;
    }
    if (supabaseTable === 'payments' && row.course_id && !migratedCourseIds.has(row.course_id)) {
      console.log(`      ⚠️ Skipping orphaned payment ${doc.id} (course ${row.course_id} does not exist)`);
      continue;
    }

    const { error } = await supabase.from(supabaseTable).upsert(row);
    if (error) {
      console.error(`      ❌ Error upserting doc ${doc.id} in ${supabaseTable}:`, error.message, JSON.stringify(row).slice(0, 200));
    } else {
      console.log(`      ✅ Upserted ${doc.id} to ${supabaseTable}`);
      // Record successfully migrated IDs
      if (supabaseTable === 'folders') migratedFolderIds.add(doc.id);
      if (supabaseTable === 'tests') migratedTestIds.add(doc.id);
      if (supabaseTable === 'problems') migratedProblemIds.add(doc.id);
    }
  }
}

async function migrateFirestore() {
  console.log("\n🧹 Cleaning up target database tables (reverse dependency order)...");
  await clearTable("user_devices");
  await clearTable("user_activity");
  await clearTable("favorites");
  await clearTable("messages");
  await clearTable("payments");
  await clearTable("subscriptions");
  await clearTable("test_results");
  await clearTable("problems");
  await clearTable("topics");
  await clearTable("advices");
  await clearTable("tests");
  await clearTable("folders");
  await clearTable("certificates");
  await clearTable("home_banners");
  await clearTable("test_lists");
  await clearTable("testimonials");
  await clearTable("courses");
  await clearTable("settings", "key");
  await clearTable("promo_codes");
  await clearTable("motivational_phrases");
  await clearTable("motivation_settings");
  await clearTable("news_items");
  await clearTable("categories");
  await clearTable("users");
  console.log("🧹 Database cleanup completed.\n");

  console.log("\n🚀 Starting Firestore Data Migration...");

  // Phase 1: Parent Independent Tables
  console.log("\n--- Users (Profiles) ---");
  await migrateCollection(db.collection("users"), "users");

  console.log("\n--- Categories ---");
  await migrateCollection(db.collection("categories"), "categories");

  console.log("\n--- News Items ---");
  await migrateCollection(db.collection("newsItems"), "news_items");

  console.log("\n--- Motivations ---");
  await migrateCollection(db.collection("motivations"), "motivational_phrases");

  console.log("\n--- Motivation Settings ---");
  await migrateCollection(db.collection("motivationSettings"), "motivation_settings");

  console.log("\n--- Settings (Author Info & Branding) ---");
  await migrateCollection(db.collection("settings"), "settings");

  console.log("\n--- Social Links (Root) ---");
  await migrateCollection(db.collection("socialLinks"), "social_links");

  console.log("\n--- Promo Codes ---");
  await migrateCollection(db.collection("promoCodes"), "promo_codes");

  // Phase 2: Courses & Subcollections (Folders, Topics, Problems, Tests, Advices, Social Links)
  console.log("\n--- Courses & Hierarchical Subcollections ---");
  const coursesSnap = await db.collection("courses").get();
  console.log(`Found ${coursesSnap.size} courses in Firestore.`);

  for (const courseDoc of coursesSnap.docs) {
    const courseId = courseDoc.id;
    const courseData = courseDoc.data();
    if (!courseData.id) courseData.id = courseId;

    console.log(`\n📚 Migrating Course: ${courseData.title} (${courseId})`);
    
    const courseRow = translateRow(courseData, "courses", courseId);
    const { error: courseErr } = await supabase.from("courses").upsert(courseRow);
    if (courseErr) {
      console.error(`   ❌ Error upserting course ${courseId}:`, courseErr.message);
      continue;
    }
    console.log(`   ✅ Upserted Course: ${courseId}`);
    migratedCourseIds.add(courseId); // Record course ID

    console.log(`   Migrating Folders...`);
    await migrateCollection(
      db.collection("courses").doc(courseId).collection("folders"),
      "folders",
      { courseId }
    );

    console.log(`   Migrating Tests...`);
    await migrateCollection(
      db.collection("courses").doc(courseId).collection("tests"),
      "tests",
      { courseId }
    );

    console.log(`   Migrating Advices...`);
    await migrateCollection(
      db.collection("courses").doc(courseId).collection("advices"),
      "advices",
      { courseId }
    );

    console.log(`   Migrating Course Social Links...`);
    await migrateCollection(
      db.collection("courses").doc(courseId).collection("socialLinks"),
      "social_links",
      { courseId }
    );

    // Topics -> Problems
    console.log(`   Migrating Topics & Problems...`);
    const topicsSnap = await db.collection("courses").doc(courseId).collection("topics").get();
    console.log(`   Found ${topicsSnap.size} topics.`);

    for (const topicDoc of topicsSnap.docs) {
      const topicId = topicDoc.id;
      const topicData = topicDoc.data();
      if (!topicData.id) topicData.id = topicId;

      console.log(`      Migrating Topic: ${topicData.title} (${topicId})`);
      const topicRow = translateRow({ ...topicData, courseId }, "topics", topicId);
      const { error: topicErr } = await supabase.from("topics").upsert(topicRow);
      if (topicErr) {
        console.error(`      ❌ Error upserting topic ${topicId}:`, topicErr.message);
        continue;
      }
      console.log(`      ✅ Upserted Topic: ${topicId}`);
      migratedTopicIds.add(topicId); // Record topic ID

      console.log(`      Migrating Problems for Topic ${topicId}...`);
      await migrateCollection(
        db.collection("courses").doc(courseId).collection("topics").doc(topicId).collection("problems"),
        "problems",
        { courseId, topicId }
      );
    }
  }

  // Phase 3: Tables referencing Courses/Tests
  console.log("\n--- Home Banners ---");
  await migrateCollection(db.collection("homeBanners"), "home_banners");

  console.log("\n--- Test Lists ---");
  await migrateCollection(db.collection("testLists"), "test_lists");

  console.log("\n--- Testimonials ---");
  await migrateCollection(db.collection("testimonials"), "testimonials");

  console.log("\n--- Certificates ---");
  await migrateCollection(db.collection("certificates"), "certificates");

  console.log("\n--- User Progress ---");
  await migrateCollection(db.collection("progress"), "user_progress");

  console.log("\n--- Test Results ---");
  await migrateCollection(db.collection("testResults"), "test_results");

  console.log("\n--- Subscriptions ---");
  await migrateCollection(db.collection("subscriptions"), "subscriptions");

  console.log("\n--- Payments ---");
  await migrateCollection(db.collection("payments"), "payments");

  console.log("\n--- Messages ---");
  await migrateCollection(db.collection("messages"), "messages");

  console.log("\n--- Favorites ---");
  await migrateCollection(db.collection("favorites"), "favorites");

  console.log("\n--- User Activity ---");
  await migrateCollection(db.collection("userActivity"), "user_activity");

  console.log("\n--- Admin Notifications ---");
  await migrateCollection(db.collection("notifications"), "admin_notifications");

  console.log("\n--- User Devices ---");
  await migrateCollection(db.collection("userDevices"), "user_devices");

  console.log("\n✅ Firestore Data Migration completed.");
}

async function main() {
  console.log("🔥 EduKids 2 Firebase to Supabase Migration Tool 🔥");
  console.log("==================================================");
  try {
    // 0. Load all known Firebase User UIDs dynamically
    try {
      const usersData = JSON.parse(readFileSync(resolve(__dirname, "../../users.json"), "utf8"));
      const accounts = usersData.users || [];
      for (const acc of accounts) {
        firebaseUserIds.add(acc.localId);
      }
    } catch (e) {
      console.log("⚠️ Warning: users.json not found or could not be loaded.");
    }
    
    try {
      const usersSnap = await db.collection("users").get();
      for (const uDoc of usersSnap.docs) {
        firebaseUserIds.add(uDoc.id);
      }
    } catch (e) {
      console.log("⚠️ Warning: Firestore users collection could not be loaded.");
    }
    console.log(`Loaded ${firebaseUserIds.size} known Firebase User UIDs for translation.`);

    await migrateAuthUsers();
    await migrateStorage();
    await migrateFirestore();
    console.log("\n🎉 ALL MIGRATIONS COMPLETED SUCCESSFULLY! 🎉");
    process.exit(0);
  } catch (err) {
    console.error("\n❌ Migration failed with critical error:", err);
    process.exit(1);
  }
}

main();
