import { supabase, toCamel, toSnake, stringToUUID } from "../supabase";
import type { User, UserProgress, TestResult, Subscription, Payment, UserActivity, ActivitySession, FavoriteTopic, Certificate } from "../types";

// Helper to format date as today's date string YYYY-MM-DD
function getTodayDateStr(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

// ============ USERS ============

export async function getUserById(userId: string): Promise<User | null> {
  const uuid = stringToUUID(userId);
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", uuid)
    .maybeSingle();

  if (error || !data) return null;
  return toCamel<User>(data);
}

export async function createUser(user: User): Promise<void> {
  const snakeUser = toSnake(user);
  snakeUser.id = stringToUUID(user.id);
  
  const { error } = await supabase
    .from("users")
    .upsert(snakeUser);
    
  if (error) throw new Error(error.message);
}

export async function updateUser(userId: string, data: Partial<User>): Promise<void> {
  const uuid = stringToUUID(userId);
  const cleanData: Record<string, any> = { updated_at: Date.now() };
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      let snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      cleanData[snakeKey] = value;
    }
  }

  const { error } = await supabase
    .from("users")
    .update(cleanData)
    .eq("id", uuid);

  if (error) throw new Error(error.message);
}

export async function getAllStudents(): Promise<User[]> {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("role", "student")
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return toCamel<User[]>(data);
}

// ============ PROGRESS ============

export async function getUserProgress(userId: string, courseId: string): Promise<UserProgress | null> {
  const userUuid = stringToUUID(userId);
  const id = `${userUuid}_${courseId}`;
  
  const { data, error } = await supabase
    .from("user_progress")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  return toCamel<UserProgress>(data);
}

export async function setUserProgress(progress: UserProgress): Promise<void> {
  const userUuid = stringToUUID(progress.userId);
  const progressId = `${userUuid}_${progress.courseId}`;
  
  const snakeProg = toSnake(progress);
  snakeProg.id = progressId;
  snakeProg.user_id = userUuid;
  
  const { error } = await supabase
    .from("user_progress")
    .upsert(snakeProg);

  if (error) {
    // Foreign key constraint xatosini ignore qilish (user profil yaratilmagan)
    if (error.message.includes("violates foreign key constraint")) {
      console.warn(`User profile not found for ${progress.userId}, skipping progress sync`);
      return;
    }
    throw new Error(error.message);
  }
}

export async function updateUserProgress(progressId: string, data: Partial<UserProgress>): Promise<void> {
  // progressId is already mapped to ${userUuid}_${courseId} by frontend if it uses getUserProgress output
  const snakeData = toSnake(data);
  const { error } = await supabase
    .from("user_progress")
    .update(snakeData)
    .eq("id", progressId);

  if (error) throw new Error(error.message);
}

export async function getAllProgressByUser(userId: string): Promise<UserProgress[]> {
  const userUuid = stringToUUID(userId);
  const { data, error } = await supabase
    .from("user_progress")
    .select("*")
    .eq("user_id", userUuid);

  if (error || !data) return [];
  return toCamel<UserProgress[]>(data);
}

export async function getStudentCountByCourse(courseId: string): Promise<number> {
  const { count, error } = await supabase
    .from("user_progress")
    .select("*", { count: "exact", head: true })
    .eq("course_id", courseId);

  if (error) return 0;
  return count || 0;
}

export async function getAllProgressByCourse(courseId: string): Promise<UserProgress[]> {
  const { data, error } = await supabase
    .from("user_progress")
    .select("*")
    .eq("course_id", courseId);

  if (error || !data) return [];
  return toCamel<UserProgress[]>(data);
}

// ============ TEST RESULTS ============

export async function saveTestResult(result: TestResult): Promise<void> {
  const userUuid = stringToUUID(result.userId);
  const snakeResult = toSnake(result);
  snakeResult.user_id = userUuid;

  const { error } = await supabase
    .from("test_results")
    .upsert(snakeResult);

  if (error) throw new Error(error.message);
}

export async function getTestResultsByUser(userId: string): Promise<TestResult[]> {
  const userUuid = stringToUUID(userId);
  const { data, error } = await supabase
    .from("test_results")
    .select("*")
    .eq("user_id", userUuid)
    .order("completed_at", { ascending: false });

  if (error || !data) return [];
  return toCamel<TestResult[]>(data);
}

export async function getAllTestResults(): Promise<TestResult[]> {
  const { data, error } = await supabase
    .from("test_results")
    .select("*");

  if (error || !data) return [];
  return toCamel<TestResult[]>(data);
}

export async function getTestResultsByTest(testId: string): Promise<TestResult[]> {
  const { data, error } = await supabase
    .from("test_results")
    .select("*")
    .eq("test_id", testId)
    .order("completed_at", { ascending: false });

  if (error || !data) return [];
  return toCamel<TestResult[]>(data);
}

// ============ SUBSCRIPTIONS ============

export async function getUserSubscription(userId: string): Promise<Subscription | null> {
  const userUuid = stringToUUID(userId);
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", userUuid)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return toCamel<Subscription>(data);
}

export async function getAllUserSubscriptions(userId: string): Promise<Subscription[]> {
  const userUuid = stringToUUID(userId);
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", userUuid)
    .order("start_date", { ascending: false });

  if (error || !data) return [];
  return toCamel<Subscription[]>(data);
}

export async function createSubscription(sub: Subscription): Promise<void> {
  const userUuid = stringToUUID(sub.userId);
  const snakeSub = toSnake(sub);
  snakeSub.user_id = userUuid;

  const { error } = await supabase
    .from("subscriptions")
    .upsert(snakeSub);

  if (error) throw new Error(error.message);
}

export async function cancelSubscription(subscriptionId: string): Promise<void> {
  const { error } = await supabase
    .from("subscriptions")
    .update({
      status: "cancelled",
      cancelled_at: Date.now()
    })
    .eq("id", subscriptionId);

  if (error) throw new Error(error.message);
}

// ============ PAYMENTS ============

export async function createPayment(payment: Payment): Promise<void> {
  const userUuid = stringToUUID(payment.userId);
  const snakePay = toSnake(payment);
  snakePay.user_id = userUuid;

  const { error } = await supabase
    .from("payments")
    .upsert(snakePay);

  if (error) throw new Error(error.message);
}

export async function getRecentPayments(limitCount = 10): Promise<Payment[]> {
  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limitCount);

  if (error || !data) return [];
  return toCamel<Payment[]>(data);
}

export async function getPaymentsByUser(userId: string): Promise<Payment[]> {
  const userUuid = stringToUUID(userId);
  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .eq("user_id", userUuid)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return toCamel<Payment[]>(data);
}

// ============ BAN & DELETE ============

export async function banUser(userId: string): Promise<void> {
  const uuid = stringToUUID(userId);
  const { error } = await supabase
    .from("users")
    .update({ is_banned: true, banned_at: Date.now(), updated_at: Date.now() })
    .eq("id", uuid);

  if (error) throw new Error(error.message);
}

export async function unbanUser(userId: string): Promise<void> {
  const uuid = stringToUUID(userId);
  const { error } = await supabase
    .from("users")
    .update({ is_banned: false, banned_at: null, updated_at: Date.now() })
    .eq("id", uuid);

  if (error) throw new Error(error.message);
}

export async function deleteUserCompletely(userId: string): Promise<void> {
  const uuid = stringToUUID(userId);
  // Cascade deletes handle the rest on PostgreSQL!
  const { error } = await supabase
    .from("users")
    .delete()
    .eq("id", uuid);

  if (error) throw new Error(error.message);
}

// ============ USER ACTIVITY (Faollik) ============

export async function startUserSession(userId: string, userName: string): Promise<void> {
  const userUuid = stringToUUID(userId);
  const dateStr = getTodayDateStr();
  const id = `${userUuid}_${dateStr}`;

  const { data: existing, error: getErr } = await supabase
    .from("user_activity")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  const session: ActivitySession = {
    startedAt: Date.now(),
    durationMinutes: 0,
  };

  if (getErr) {
    console.warn("[startUserSession] get activity warning:", getErr.message);
    return;
  }

  if (existing) {
    const activity = toCamel<UserActivity>(existing);
    const { error: updErr } = await supabase
      .from("user_activity")
      .update({
        sessions: [...(activity.sessions || []), session],
        last_active_at: Date.now()
      })
      .eq("id", id);
    if (updErr) {
      console.warn("[startUserSession] update warning:", updErr.message);
    }
  } else {
    const activity: UserActivity = {
      id,
      userId: userUuid,
      userName,
      date: dateStr,
      totalMinutes: 0,
      sessions: [session],
      lastActiveAt: Date.now(),
    };
    const { error: insErr } = await supabase
      .from("user_activity")
      .insert(toSnake(activity));
    if (insErr) {
      console.warn("[startUserSession] insert warning:", insErr.message);
    }
  }
}

export async function updateSessionTime(userId: string): Promise<void> {
  try {
    const userUuid = stringToUUID(userId);
    const dateStr = getTodayDateStr();
    const id = `${userUuid}_${dateStr}`;

    // Read current activity
    const { data, error } = await supabase
      .from("user_activity")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error || !data) return;
    const activity = toCamel<UserActivity>(data);
    if (!activity.sessions || activity.sessions.length === 0) return;

    const sessions = [...activity.sessions];
    const lastSession = { ...sessions[sessions.length - 1] };
    const elapsed = (Date.now() - lastSession.startedAt) / 60000;
    lastSession.durationMinutes = Math.round(elapsed);
    sessions[sessions.length - 1] = lastSession;

    const totalMinutes = sessions.reduce((sum, s) => sum + s.durationMinutes, 0);

    const { error: updErr } = await supabase
      .from("user_activity")
      .update({
        sessions,
        total_minutes: totalMinutes,
        last_active_at: Date.now()
      })
      .eq("id", id);

    if (updErr) {
      console.warn("[updateSessionTime] warning:", updErr.message);
    }
  } catch (err: any) {
    console.warn("[updateSessionTime] error:", err?.message || err);
  }
}

export async function endUserSession(userId: string): Promise<void> {
  try {
    const userUuid = stringToUUID(userId);
    const dateStr = getTodayDateStr();
    const id = `${userUuid}_${dateStr}`;

    const { data, error } = await supabase
      .from("user_activity")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error || !data) return;
    const activity = toCamel<UserActivity>(data);
    if (!activity.sessions || activity.sessions.length === 0) return;

    const sessions = [...activity.sessions];
    const lastSession = { ...sessions[sessions.length - 1] };
    lastSession.endedAt = Date.now();
    lastSession.durationMinutes = Math.round((Date.now() - lastSession.startedAt) / 60000);
    sessions[sessions.length - 1] = lastSession;

    const totalMinutes = sessions.reduce((sum, s) => sum + s.durationMinutes, 0);

    const { error: updErr } = await supabase
      .from("user_activity")
      .update({
        sessions,
        total_minutes: totalMinutes,
        last_active_at: Date.now()
      })
      .eq("id", id);

    if (updErr) {
      console.warn("[endUserSession] warning:", updErr.message);
    }
  } catch (err: any) {
    console.warn("[endUserSession] error:", err?.message || err);
  }
}

export async function getAllStudentActivities(daysBack = 7): Promise<UserActivity[]> {
  const safeDaysBack = Math.max(1, daysBack);
  const now = new Date();
  const dates: string[] = [];
  for (let i = 0; i < safeDaysBack; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    dates.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
  }

  const { data, error } = await supabase
    .from("user_activity")
    .select("*")
    .in("date", dates)
    .order("last_active_at", { ascending: false });

  if (error || !data) return [];
  return toCamel<UserActivity[]>(data);
}

export async function getTodayActiveStudents(): Promise<UserActivity[]> {
  const dateStr = getTodayDateStr();
  const { data, error } = await supabase
    .from("user_activity")
    .select("*")
    .eq("date", dateStr)
    .order("last_active_at", { ascending: false });

  if (error || !data) return [];
  return toCamel<UserActivity[]>(data);
}

// ============ FAVORITE TOPICS (Tanlangan mavzular) ============

export async function addFavoriteTopic(fav: FavoriteTopic): Promise<void> {
  const userUuid = stringToUUID(fav.userId);
  const id = `${userUuid}_${fav.topicId}`;
  
  const snakeFav = toSnake(fav);
  snakeFav.id = id;
  snakeFav.user_id = userUuid;

  const { error } = await supabase
    .from("favorites")
    .upsert(snakeFav);

  if (error) throw new Error(error.message);
}

export async function removeFavoriteTopic(favId: string): Promise<void> {
  // favId is constructed as ${userId}_${topicId} on client side
  const parts = favId.split('_');
  const userUuid = stringToUUID(parts[0]);
  const topicId = parts[1];
  const mappedFavId = `${userUuid}_${topicId}`;

  const { error } = await supabase
    .from("favorites")
    .delete()
    .eq("id", mappedFavId);

  if (error) throw new Error(error.message);
}

export async function getFavoriteTopics(userId: string): Promise<FavoriteTopic[]> {
  const userUuid = stringToUUID(userId);
  const { data, error } = await supabase
    .from("favorites")
    .select("*")
    .eq("user_id", userUuid)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return toCamel<FavoriteTopic[]>(data);
}

export async function isFavoriteTopic(userId: string, topicId: string): Promise<boolean> {
  const userUuid = stringToUUID(userId);
  const id = `${userUuid}_${topicId}`;
  
  const { data, error } = await supabase
    .from("favorites")
    .select("id")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return false;
  return true;
}

// ============ CERTIFICATES (Sertifikatlar) ============

export async function getCertificatesByUser(userId: string): Promise<Certificate[]> {
  const userUuid = stringToUUID(userId);
  const { data, error } = await supabase
    .from("certificates")
    .select("*")
    .eq("user_id", userUuid)
    .order("issued_at", { ascending: false });

  if (error || !data) return [];
  return toCamel<Certificate[]>(data);
}

export async function getCertificate(userId: string, courseId: string): Promise<Certificate | null> {
  const userUuid = stringToUUID(userId);
  const id = `cert-${userUuid}-${courseId}`;
  
  const { data, error } = await supabase
    .from("certificates")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  return toCamel<Certificate>(data);
}

export async function createCertificate(cert: Certificate): Promise<void> {
  const userUuid = stringToUUID(cert.userId);
  const id = `cert-${userUuid}-${cert.courseId}`;

  const snakeCert = toSnake(cert);
  snakeCert.id = id;
  snakeCert.user_id = userUuid;

  const { error } = await supabase
    .from("certificates")
    .upsert(snakeCert);

  if (error) throw new Error(error.message);
}

export async function getAllCertificates(): Promise<Certificate[]> {
  const { data, error } = await supabase
    .from("certificates")
    .select("*")
    .order("issued_at", { ascending: false });

  if (error || !data) return [];
  return toCamel<Certificate[]>(data);
}
