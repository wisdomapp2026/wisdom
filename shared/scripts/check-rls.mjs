/**
 * RLS holatini tekshirish: anon (mehmon) va authenticated foydalanuvchi
 * nimalarni o'qiy/yoza olishini ko'rsatadi.
 *
 * Ishlatish: node shared/scripts/check-rls.mjs
 */
import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../../.env") });

const URL = process.env.VITE_SUPABASE_URL;
const ANON = process.env.VITE_SUPABASE_ANON_KEY;
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY;

const anon = () => createClient(URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
const svc = createClient(URL, SVC, { auth: { persistSession: false, autoRefreshToken: false } });

let risks = 0;

async function main() {
  console.log("=".repeat(70));
  console.log("RLS HOLATI TEKSHIRUVI");
  console.log("=".repeat(70));

  // ---------- 1. MEHMON (anon) o'qish ----------
  console.log("\n1. MEHMON (login qilmagan) NIMALARNI O'QIYDI\n");

  // Bu jadvallar mehmon uchun ochiq bo'lishi KERAK (kurs katalogi)
  const shouldBePublic = [
    "courses", "categories", "folders", "topics", "problems", "tests",
    "news_items", "home_banners", "testimonials", "motivational_phrases",
    "motivation_settings", "social_links", "advices",
  ];
  // Bu jadvallar mehmon uchun YOPIQ bo'lishi kerak (maxfiy ma'lumot)
  const shouldBePrivate = [
    "users", "payments", "subscriptions", "messages", "user_activity",
    "user_devices", "certificates", "admin_notifications", "favorites",
  ];

  for (const t of shouldBePublic) {
    const { data, error } = await anon().from(t).select("*").limit(1);
    const ok = !error;
    console.log(`   ${ok ? "OK  " : "MUAMMO"}  ${t.padEnd(22)} ${ok ? "o'qish mumkin (to'g'ri)" : "BLOKLANGAN — mehmon kurslarni ko'rmaydi!"}`);
    if (!ok) risks++;
  }

  console.log("");
  for (const t of shouldBePrivate) {
    const { data, error } = await anon().from(t).select("*").limit(1);
    const blocked = !!error || (data?.length ?? 0) === 0;
    const readable = !error && (data?.length ?? 0) > 0;
    console.log(`   ${readable ? "XAVF" : "OK  "}  ${t.padEnd(22) } ${readable ? "MEHMON O'QIY OLADI — maxfiy ma'lumot ochiq!" : "bloklangan (to'g'ri)"}`);
    if (readable) risks++;
  }

  // ---------- 2. MEHMON yozish ----------
  console.log("\n2. MEHMON YOZA OLADIMI (bo'lmasligi kerak)\n");

  const { data: c1 } = await svc.from("courses").select("id, title").limit(1).maybeSingle();
  if (c1) {
    const { data: upd, error: upErr } = await anon()
      .from("courses").update({ title: c1.title }).eq("id", c1.id).select();
    const wrote = !upErr && (upd?.length ?? 0) > 0;
    console.log(`   ${wrote ? "XAVF" : "OK  "}  UPDATE courses          ${wrote ? "MEHMON KURSNI O'ZGARTIRA OLADI!" : "bloklangan (to'g'ri)"}`);
    if (wrote) risks++;
  }

  const { error: delErr } = await anon().from("users").delete().eq("id", "00000000-0000-0000-0000-000000000000");
  console.log(`   ${!delErr ? "XAVF" : "OK  "}  DELETE users            ${!delErr ? "MEHMON PROFIL O'CHIRA OLADI!" : "bloklangan (to'g'ri)"}`);
  if (!delErr) risks++;

  const { error: subErr } = await anon().from("subscriptions").insert({
    id: `__rls_probe_${Date.now()}`, user_id: "00000000-0000-0000-0000-000000000000",
    status: "active", plan: "probe", price_per_month: 0,
    start_date: Date.now(), end_date: Date.now() + 9e9,
  });
  const subWrote = !subErr || !String(subErr.message).match(/row-level security|permission/i);
  console.log(`   ${subWrote ? "XAVF" : "OK  "}  INSERT subscriptions    ${subWrote ? "premium obuna yozib qo'yish mumkin!" : "bloklangan (to'g'ri)"}`);
  if (subWrote) risks++;

  // ---------- 3. O'QUVCHI (authenticated) ----------
  console.log("\n3. O'QUVCHI SIFATIDA (login qilgan)\n");

  const sb = anon();
  const { data: auth, error: authErr } = await sb.auth.signInWithPassword({
    email: "998932929262@edukids.uz", password: "123456",
  });

  if (authErr) {
    console.log(`   Login bo'lmadi: ${authErr.message}`);
  } else {
    const uid = auth.user.id;

    const { data: own } = await sb.from("users").select("id, name").eq("id", uid).maybeSingle();
    console.log(`   ${own ? "OK  " : "MUAMMO"}  o'z profilini o'qish    ${own ? `"${own.name}"` : "TOPILMADI — login buziladi!"}`);
    if (!own) risks++;

    // O'zgalarning to'lovini ko'ra oladimi?
    const { data: otherPay } = await sb.from("payments").select("id, user_id").neq("user_id", uid).limit(1);
    const seesOthers = (otherPay?.length ?? 0) > 0;
    console.log(`   ${seesOthers ? "XAVF" : "OK  "}  o'zgalar to'lovi        ${seesOthers ? "BOSHQA ODAM TO'LOVINI KO'RADI!" : "bloklangan (to'g'ri)"}`);
    if (seesOthers) risks++;

    // O'ziga obuna yozib qo'ya oladimi?
    const { error: sErr } = await sb.from("subscriptions").insert({
      id: `__rls_probe_${Date.now()}`, user_id: uid, status: "active",
      plan: "probe", price_per_month: 0, start_date: Date.now(), end_date: Date.now() + 9e9,
    });
    const selfSub = !sErr;
    console.log(`   ${selfSub ? "XAVF" : "OK  "}  o'ziga premium obuna    ${selfSub ? "O'ZIGA PREMIUM YOZIB QO'YA OLADI!" : "bloklangan (to'g'ri)"}`);
    if (selfSub) risks++;

    // Kursni o'zgartira oladimi?
    if (c1) {
      const { data: cu, error: cuErr } = await sb.from("courses").update({ title: c1.title }).eq("id", c1.id).select();
      const canEdit = !cuErr && (cu?.length ?? 0) > 0;
      console.log(`   ${canEdit ? "XAVF" : "OK  "}  kursni tahrirlash       ${canEdit ? "O'QUVCHI KURSNI O'ZGARTIRA OLADI!" : "bloklangan (to'g'ri)"}`);
      if (canEdit) risks++;
    }

    // O'z progressini yozadimi? (ishlashi KERAK)
    const { data: crs } = await sb.from("courses").select("id").limit(1).maybeSingle();
    if (crs) {
      const pid = `${uid}_${crs.id}`;
      const { data: ex } = await sb.from("user_progress").select("*").eq("id", pid).maybeSingle();
      const row = ex ?? {
        id: pid, user_id: uid, course_id: crs.id, completed_topics: [], completed_problems: [],
        progress_percent: 0, total_xp: 0, streak: 0, weekly_minutes: [0, 0, 0, 0, 0, 0, 0],
        last_accessed_at: Date.now(),
      };
      const { error: pErr } = await sb.from("user_progress").upsert({ ...row, last_accessed_at: Date.now() });
      console.log(`   ${pErr ? "MUAMMO" : "OK  "}  o'z progressini yozish  ${pErr ? `BLOKLANGAN: ${pErr.message}` : "ishlaydi (to'g'ri)"}`);
      if (pErr) risks++;
    }

    await sb.auth.signOut();
  }

  // ---------- 4. ADMIN ----------
  console.log("\n4. ADMIN SIFATIDA\n");
  const asb = anon();
  const { error: aErr } = await asb.auth.signInWithPassword({ email: "admin@edukids.uz", password: "admin123" });
  if (aErr) {
    console.log(`   Login bo'lmadi: ${aErr.message}`);
  } else {
    const { data: allUsers } = await asb.from("users").select("id").limit(50);
    console.log(`   ${(allUsers?.length ?? 0) > 1 ? "OK  " : "MUAMMO"}  barcha profillar        ${allUsers?.length ?? 0} ta ko'rindi`);
    if ((allUsers?.length ?? 0) <= 1) risks++;

    const { data: pays } = await asb.from("payments").select("id").limit(50);
    console.log(`   ${(pays?.length ?? 0) > 0 ? "OK  " : "MUAMMO"}  barcha to'lovlar        ${pays?.length ?? 0} ta ko'rindi`);
    if ((pays?.length ?? 0) === 0) risks++;

    if (c1) {
      const { data: cu, error: cuErr } = await asb.from("courses").update({ title: c1.title }).eq("id", c1.id).select();
      const ok = !cuErr && (cu?.length ?? 0) > 0;
      console.log(`   ${ok ? "OK  " : "MUAMMO"}  kursni tahrirlash       ${ok ? "ishlaydi (to'g'ri)" : `BLOKLANGAN: ${cuErr?.message}`}`);
      if (!ok) risks++;
    }

    await asb.auth.signOut();
  }

  // Sinov qoldiqlarini tozalash
  await svc.from("subscriptions").delete().like("id", "__rls_probe_%");

  console.log("\n" + "=".repeat(70));
  if (risks === 0) {
    console.log("NATIJA: muammo topilmadi — RLS to'g'ri sozlangan.");
  } else {
    console.log(`NATIJA: ${risks} ta muammo topildi.`);
    console.log("Agar 'XAVF' belgilari bo'lsa: shared/scripts/rls-policies.sql ni");
    console.log("Supabase Dashboard -> SQL Editor da ishga tushiring.");
  }
  console.log("=".repeat(70));
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
