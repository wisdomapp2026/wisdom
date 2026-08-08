/**
 * Uchdan-uchiga sinov: haqiqiy foydalanuvchi sessiyasi bilan ilova
 * ishlatadigan barcha asosiy so'rovlarni takrorlash.
 *
 * Client dagi mantiq (stringToUUID, toCamel) aynan takrorlanadi.
 */
import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../../.env") });

const URL = process.env.VITE_SUPABASE_URL;
const ANON = process.env.VITE_SUPABASE_ANON_KEY;

const UUID_SHAPE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function stringToUUID(str) {
  if (!str) return "";
  if (str === "admin") str = "admin-001";
  if (UUID_SHAPE.test(str)) return str.toLowerCase();
  const h = crypto.createHash("md5").update(str).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}
function toCamel(obj) {
  if (!obj) return obj;
  if (Array.isArray(obj)) return obj.map(toCamel);
  if (typeof obj !== "object") return obj;
  const r = {};
  for (const [k, v] of Object.entries(obj)) {
    let ck = k.replace(/_([a-z])/g, (_, l) => l.toUpperCase());
    if (ck === "totalXp") ck = "totalXP";
    if (ck === "testXp") ck = "testXP";
    r[ck] = v;
  }
  return r;
}

let pass = 0, fail = 0;
function check(label, ok, extra = "") {
  if (ok) { pass++; console.log(`  OK    ${label}${extra ? "  " + extra : ""}`); }
  else { fail++; console.log(`  XATO  ${label}${extra ? "  " + extra : ""}`); }
}

async function run(label, email, password) {
  console.log(`\n${"=".repeat(64)}\n${label}: ${email}\n${"=".repeat(64)}`);
  const sb = createClient(URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: auth, error: authErr } = await sb.auth.signInWithPassword({ email, password });
  check("login", !authErr && !!auth?.session, authErr?.message || "");
  if (authErr) return;

  const uid = auth.user.id;
  console.log(`  uid = ${uid}`);

  // --- App.tsx: profil o'qish (login buzilishining asosiy nuqtasi) ---
  const uuid = stringToUUID(uid);
  const { data: prof } = await sb.from("users").select("*").eq("id", uuid).maybeSingle();
  check("getUserById (profil) — bu yerda login buzilgan edi", !!prof, prof ? `name="${prof.name}" role=${prof.role}` : "profil topilmadi");

  // --- App.tsx: settings platform (tema) ---
  const { data: plat } = await sb.from("settings").select("value").eq("key", "platform").maybeSingle();
  check("settings['platform'] (tema/sozlamalar)", !!plat?.value);

  // --- Home: kurslar ---
  const { data: courses, error: cErr } = await sb.from("courses").select("*").order("order", { ascending: true });
  check("getAllCourses", !cErr && (courses?.length ?? 0) > 0, `${courses?.length ?? 0} kurs`);

  // --- Home: bannerlar, yangiliklar, otzivlar, motivatsiya, ijtimoiy tarmoq ---
  const { data: banners } = await sb.from("home_banners").select("*").eq("is_active", true);
  check("getActiveBanners", (banners?.length ?? 0) > 0, `${banners?.length ?? 0}`);
  const { data: news } = await sb.from("news_items").select("*").eq("is_active", true);
  check("getActiveNewsItems", (news?.length ?? 0) > 0, `${news?.length ?? 0}`);
  const { data: tm } = await sb.from("testimonials").select("*").eq("is_active", true);
  check("getActiveTestimonials", (tm?.length ?? 0) >= 0, `${tm?.length ?? 0}`);
  const { data: mot } = await sb.from("motivational_phrases").select("*");
  check("getMotivationPhrases", (mot?.length ?? 0) > 0, `${mot?.length ?? 0}`);
  const { data: sl } = await sb.from("social_links").select("*").is("course_id", null).eq("is_active", true);
  check("getActiveSocialLinks", (sl?.length ?? 0) > 0, `${sl?.length ?? 0}`);

  // --- Progress ---
  const { data: progress } = await sb.from("user_progress").select("*").eq("user_id", uuid);
  check("getAllProgressByUser", Array.isArray(progress), `${progress?.length ?? 0} kurs progressi`);

  // --- CourseDetail: mavzular, testlar, papkalar, maslahatlar ---
  const cid = courses?.[0]?.id;
  if (cid) {
    const { data: topics } = await sb.from("topics").select("*").eq("course_id", cid).order("order");
    check(`getTopicsByCourse(${cid})`, Array.isArray(topics), `${topics?.length ?? 0} mavzu`);
    const { data: folders } = await sb.from("folders").select("*").eq("course_id", cid);
    check("getFoldersByCourse", Array.isArray(folders), `${folders?.length ?? 0} papka`);
    const { data: tests } = await sb.from("tests").select("*").eq("course_id", cid);
    check("getTestsByCourse", Array.isArray(tests), `${tests?.length ?? 0} test`);
    const { data: adv } = await sb.from("advices").select("*").eq("course_id", cid);
    check("getAdviceByCourse", Array.isArray(adv), `${adv?.length ?? 0} maslahat`);
    if (topics?.length) {
      const { data: probs } = await sb.from("problems").select("*").eq("topic_id", topics[0].id);
      check("getProblemsByTopic", Array.isArray(probs), `${probs?.length ?? 0} misol`);
    }
  }

  // --- Testlar / natijalar ---
  const { data: results } = await sb.from("test_results").select("*").eq("user_id", uuid);
  check("getTestResultsByUser", Array.isArray(results), `${results?.length ?? 0} natija`);

  // --- Obunalar (premium kirish) ---
  const { data: subs } = await sb.from("subscriptions").select("*").eq("user_id", uuid);
  check("getAllUserSubscriptions", Array.isArray(subs), `${subs?.length ?? 0} obuna`);

  // --- Sevimlilar / sertifikatlar / to'lovlar ---
  const { data: favs } = await sb.from("favorites").select("*").eq("user_id", uuid);
  check("getFavoriteTopics", Array.isArray(favs), `${favs?.length ?? 0}`);
  const { data: certs } = await sb.from("certificates").select("*").eq("user_id", uuid);
  check("getCertificatesByUser", Array.isArray(certs), `${certs?.length ?? 0}`);
  const { data: pays } = await sb.from("payments").select("*").eq("user_id", uuid);
  check("getPaymentsByUser", Array.isArray(pays), `${pays?.length ?? 0}`);

  // --- Bildirishnomalar (settings) ---
  const { data: sn } = await sb.from("settings").select("value").eq("key", "studentNotifications").maybeSingle();
  const snList = Array.isArray(sn?.value) ? sn.value : [];
  const mine = snList.filter((n) => !n.userId || n.userId === uid);
  check("studentNotifications", snList.length > 0, `jami=${snList.length}, menga tegishli=${mine.length}`);

  // --- Test kutubxonasi / TestBuilder (admin) ---
  const { data: tlib } = await sb.from("settings").select("value").eq("key", "testLibrary").maybeSingle();
  check("testLibrary (settings)", Array.isArray(tlib?.value) && tlib.value.length > 0, `${tlib?.value?.length ?? 0} test`);
  const { data: tbq } = await sb.from("settings").select("value").eq("key", "testBuilderQuestions").maybeSingle();
  check("testBuilderQuestions", Array.isArray(tbq?.value) && tbq.value.length > 0, `${tbq?.value?.length ?? 0} savol`);
  const { data: tbf } = await sb.from("settings").select("value").eq("key", "testBuilderFolders").maybeSingle();
  check("testBuilderFolders", Array.isArray(tbf?.value) && tbf.value.length > 0, `${tbf?.value?.length ?? 0} papka`);

  // --- Qurilmalar ---
  const { data: devs } = await sb.from("user_devices").select("*").eq("user_id", uuid);
  check("getUserDevices", Array.isArray(devs), `${devs?.length ?? 0} qurilma`);

  // --- YOZISH sinovlari (haqiqiy foydalanuvchi harakatlari) ---
  console.log("\n  -- yozish sinovlari --");

  // progress yozish (TopicDetail)
  if (cid) {
    const pid = `${uuid}_${cid}`;
    const { data: exist } = await sb.from("user_progress").select("*").eq("id", pid).maybeSingle();
    const row = exist ?? {
      id: pid, user_id: uuid, course_id: cid,
      completed_topics: [], completed_problems: [],
      progress_percent: 0, total_xp: 0, streak: 0,
      weekly_minutes: [0, 0, 0, 0, 0, 0, 0], last_accessed_at: Date.now(),
    };
    const { error: upErr } = await sb.from("user_progress").upsert({ ...row, last_accessed_at: Date.now() });
    check("setUserProgress (progress saqlash)", !upErr, upErr?.message || "");
  }

  // user_activity yozish (useActivityTracker)
  const today = new Date();
  const ds = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const aid = `${uuid}_${ds}`;
  const { error: aErr } = await sb.from("user_activity").upsert({
    id: aid, user_id: uuid, user_name: prof?.name || "O'quvchi", date: ds,
    total_minutes: 0, sessions: [{ startedAt: Date.now(), durationMinutes: 0 }], last_active_at: Date.now(),
  });
  check("startUserSession (faollik yozish)", !aErr, aErr?.message || "");

  // qurilma ro'yxatga olish (useDeviceSession)
  const did = `probe-${Date.now()}`;
  const { error: dErr } = await sb.from("user_devices").upsert({
    id: `${uuid}_${did}`, device_id: did, user_id: uuid,
    device_name: "E2E sinov", last_seen: Date.now(), created_at: Date.now(), is_active: true,
  });
  check("registerDevice (qurilma yozish)", !dErr, dErr?.message || "");
  if (!dErr) await sb.from("user_devices").delete().eq("id", `${uuid}_${did}`);

  // xabar yuborish (Messages)
  const mid = `probe-msg-${Date.now()}`;
  const { error: mErr } = await sb.from("messages").upsert({
    id: mid, from_user_id: uuid, from_name: prof?.name || "O'quvchi",
    from_role: "student", text: "E2E sinov", is_read: false, created_at: Date.now(),
  });
  check("sendMessage (xabar yuborish)", !mErr, mErr?.message || "");
  if (!mErr) await sb.from("messages").delete().eq("id", mid);

  await sb.auth.signOut();
}

async function main() {
  await run("STUDENT", "998932929262@edukids.uz", "123456");
  await run("ADMIN", "admin@edukids.uz", "admin123");

  console.log(`\n${"=".repeat(64)}\nNATIJA: ${pass} muvaffaqiyatli, ${fail} xato\n${"=".repeat(64)}`);
  process.exit(fail > 0 ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
