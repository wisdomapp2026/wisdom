import { supabase, toCamel, toSnake, stringToUUID } from "../supabase";
import type { Course, Topic, Problem, Test, Advice, Folder, MotivationalPhrase, MotivationSettings, MotivationPlacement, SocialLink, PromoCode } from "../types";

// Helper for settings arrays (stored as JSONB in settings table)
async function getSettingsArray<T>(key: string): Promise<T[]> {
  const { data, error } = await supabase
    .from("settings")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  if (error || !data) return [];
  return (data.value as T[]) || [];
}

async function saveSettingsArray<T>(key: string, array: T[]): Promise<void> {
  const { error } = await supabase
    .from("settings")
    .upsert({ key, value: array });
  if (error) throw new Error(error.message);
}

// ============ COURSES ============

export async function getAllCourses(): Promise<Course[]> {
  const { data, error } = await supabase
    .from("courses")
    .select("*")
    .order("order", { ascending: true });

  if (error || !data) return [];
  return toCamel<Course[]>(data);
}

export async function getCourseById(courseId: string): Promise<Course | null> {
  const { data, error } = await supabase
    .from("courses")
    .select("*")
    .eq("id", courseId)
    .maybeSingle();

  if (error || !data) return null;
  return toCamel<Course>(data);
}

export async function createCourse(course: Course): Promise<void> {
  const snakeCourse = toSnake(course);
  try {
    const { data: { user } } = await supabase.auth.getUser();
    snakeCourse.created_by = user?.id || null;
  } catch {
    snakeCourse.created_by = null;
  }

  const { error } = await supabase
    .from("courses")
    .upsert(snakeCourse);

  if (error) throw new Error(error.message);
}

export async function updateCourse(courseId: string, data: Partial<Course>): Promise<void> {
  const snakeData = toSnake(data);
  // Supabase unknown ustunlarni qabul qilmaydi — shu sababli xatolik bo'lsa
  // desktop ustunlarsiz qayta urinish
  const { error } = await supabase
    .from("courses")
    .update({ ...snakeData, updated_at: Date.now() })
    .eq("id", courseId);

  if (error) {
    // Agar xato "column does not exist" bo'lsa — desktop maydonlarni olib tashlab qayta urinamiz
    if (error.message?.includes("column") || error.code === "42703") {
      const fallback = { ...snakeData, updated_at: Date.now() };
      // Desktop ustunlarni olib tashlash
      delete fallback.cover_image_desktop;
      delete fallback.cover_position_desktop;
      delete fallback.cover_fit_desktop;
      delete fallback.hero_image_desktop;
      delete fallback.hero_image_position_desktop;
      delete fallback.hero_image_fit_desktop;
      const { error: err2 } = await supabase
        .from("courses")
        .update(fallback)
        .eq("id", courseId);
      if (err2) throw new Error(err2.message);
      return;
    }
    throw new Error(error.message);
  }
}

export async function enrollUserInCourse(userId: string, courseId: string): Promise<void> {
  const userUuid = stringToUUID(userId);
  const progressId = `${userUuid}_${courseId}`;

  const { data: existingProgress, error: getErr } = await supabase
    .from("user_progress")
    .select("is_joined")
    .eq("id", progressId)
    .maybeSingle();

  if (getErr) throw new Error(getErr.message);

  if (existingProgress?.is_joined) return;

  const { error: progErr } = await supabase
    .from("user_progress")
    .upsert({
      id: progressId,
      user_id: userUuid,
      course_id: courseId,
      is_joined: true,
      enrolled_at: Date.now(),
      last_accessed_at: Date.now()
    });

  if (progErr) throw new Error(progErr.message);

  // `courses.total_students` hisoblagichini oshirish.
  //
  // Bu `courses` jadvalini yozishni talab qiladi, lekin RLS bo'yicha kursni
  // faqat admin o'zgartiradi. Shuning uchun SECURITY DEFINER RPC ishlatiladi
  // (rls-policies.sql da yaratiladi). RPC mavjud bo'lmasa — bu kritik emas,
  // chunki o'quvchilar soni haqiqiy manba sifatida `user_progress` dan
  // `getStudentCountByCourse()` orqali hisoblanadi.
  const { error: rpcErr } = await supabase.rpc("increment_course_students", { p_course_id: courseId });
  if (rpcErr) {
    console.warn("total_students hisoblagichi yangilanmadi (kritik emas):", rpcErr.message);
  }
}

export async function deleteCourse(courseId: string): Promise<void> {
  const { error } = await supabase
    .from("courses")
    .delete()
    .eq("id", courseId);

  if (error) throw new Error(error.message);
}

// ============ FOLDERS (Papkalar / Kitoblar) ============

export async function getFoldersByCourse(courseId: string): Promise<Folder[]> {
  const { data, error } = await supabase
    .from("folders")
    .select("*")
    .eq("course_id", courseId)
    .order("order", { ascending: true });

  if (error || !data) return [];
  return toCamel<Folder[]>(data);
}

export async function getFolderById(courseId: string, folderId: string): Promise<Folder | null> {
  const { data, error } = await supabase
    .from("folders")
    .select("*")
    .eq("course_id", courseId)
    .eq("id", folderId)
    .maybeSingle();

  if (error || !data) return null;
  return toCamel<Folder>(data);
}

export async function createFolder(courseId: string, folder: Folder): Promise<void> {
  const snakeFolder = toSnake(folder);
  snakeFolder.course_id = courseId;

  const { error } = await supabase
    .from("folders")
    .upsert(snakeFolder);

  if (error) throw new Error(error.message);
}

export async function updateFolder(courseId: string, folderId: string, data: Partial<Folder>): Promise<void> {
  const snakeData = toSnake(data);
  const { error } = await supabase
    .from("folders")
    .update({ ...snakeData, updated_at: Date.now() })
    .eq("course_id", courseId)
    .eq("id", folderId);

  if (error) throw new Error(error.message);
}

export async function deleteFolder(courseId: string, folderId: string): Promise<void> {
  const { error } = await supabase
    .from("folders")
    .delete()
    .eq("course_id", courseId)
    .eq("id", folderId);

  if (error) throw new Error(error.message);
}

// ============ PRESENCE (Supabase Realtime Presence) ============
// Firebase da presence `courses/{id}/presence/{userId}` subkolleksiyasi orqali
// ishlagan. Supabase da buning to'g'ri ekvivalenti — Realtime Presence:
// ma'lumot vaqtinchalik (ephemeral), jadval kerak emas, va foydalanuvchi
// sahifani yopganda avtomatik o'chadi.

type PresenceEntry = {
  channel: ReturnType<typeof supabase.channel>;
  ready: Promise<void>;
};

const presenceChannels = new Map<string, PresenceEntry>();

/** Presence kanaliga qo'shilish (bir topic uchun bir marta) */
async function joinPresence(topic: string, userId: string): Promise<void> {
  if (!userId) return;

  let entry = presenceChannels.get(topic);
  if (!entry) {
    const channel = supabase.channel(topic, {
      config: { presence: { key: userId } },
    });

    const ready = new Promise<void>((resolve) => {
      // Kanal ulanmasa ham UI bloklanmasligi uchun timeout
      const timer = setTimeout(resolve, 5000);
      channel.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          channel
            .track({ userId, onlineAt: Date.now() })
            .then(() => { clearTimeout(timer); resolve(); })
            .catch(() => { clearTimeout(timer); resolve(); });
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          clearTimeout(timer);
          resolve();
        }
      });
    });

    entry = { channel, ready };
    presenceChannels.set(topic, entry);
  }

  await entry.ready;
}

/** Kanaldagi unikal foydalanuvchi ID lari */
function presenceUserIds(topic: string): string[] {
  const entry = presenceChannels.get(topic);
  if (!entry) return [];
  try {
    const state = entry.channel.presenceState() as Record<string, Array<{ userId?: string }>>;
    const ids = new Set<string>();
    for (const members of Object.values(state)) {
      for (const m of members) {
        if (m?.userId) ids.add(m.userId);
      }
    }
    return [...ids];
  } catch {
    return [];
  }
}

/** Kanaldan chiqish */
async function leavePresence(topic: string): Promise<void> {
  const entry = presenceChannels.get(topic);
  if (!entry) return;
  presenceChannels.delete(topic);
  try {
    await entry.channel.untrack();
  } catch {
    // jim
  }
  try {
    await supabase.removeChannel(entry.channel);
  } catch {
    // jim
  }
}

const folderTopic = (courseId: string, folderId: string) => `presence:folder:${courseId}:${folderId}`;
const topicTopic = (courseId: string, topicId: string) => `presence:topic:${courseId}:${topicId}`;
const courseTopic = (courseId: string) => `presence:course:${courseId}`;

// ---- Folder presence ----

export async function markFolderPresence(courseId: string, folderId: string, userId: string): Promise<void> {
  await joinPresence(folderTopic(courseId, folderId), userId);
}

export async function clearFolderPresence(courseId: string, folderId: string, _userId: string): Promise<void> {
  await leavePresence(folderTopic(courseId, folderId));
}

export async function getFolderOnlineCount(courseId: string, folderId: string): Promise<number> {
  return presenceUserIds(folderTopic(courseId, folderId)).length;
}

// ---- Topic presence ----

export async function markTopicPresence(courseId: string, topicId: string, userId: string): Promise<void> {
  await joinPresence(topicTopic(courseId, topicId), userId);
}

export async function clearTopicPresence(courseId: string, topicId: string, _userId: string): Promise<void> {
  await leavePresence(topicTopic(courseId, topicId));
}

export async function getTopicPresenceUsers(courseId: string, topicId: string): Promise<string[]> {
  return presenceUserIds(topicTopic(courseId, topicId));
}

// ---- Course presence ----

export async function markCoursePresence(courseId: string, userId: string): Promise<void> {
  await joinPresence(courseTopic(courseId), userId);
}

export async function clearCoursePresence(courseId: string, _userId: string): Promise<void> {
  await leavePresence(courseTopic(courseId));
}

export async function getCourseOnlineCount(courseId: string): Promise<number> {
  return presenceUserIds(courseTopic(courseId)).length;
}

// ============ TOPICS ============

export async function getTopicsByCourse(courseId: string): Promise<Topic[]> {
  const { data, error } = await supabase
    .from("topics")
    .select("*")
    .eq("course_id", courseId)
    .order("order", { ascending: true });

  if (error || !data) return [];
  return toCamel<Topic[]>(data);
}

export async function getTopicById(courseId: string, topicId: string): Promise<Topic | null> {
  const { data, error } = await supabase
    .from("topics")
    .select("*")
    .eq("course_id", courseId)
    .eq("id", topicId)
    .maybeSingle();

  if (error || !data) return null;
  return toCamel<Topic>(data);
}

export async function createTopic(courseId: string, topic: Topic): Promise<void> {
  const snakeTopic = toSnake(topic);
  snakeTopic.course_id = courseId;

  const { error } = await supabase
    .from("topics")
    .upsert(snakeTopic);

  if (error) throw new Error(error.message);
}

export async function updateTopic(courseId: string, topicId: string, data: Partial<Topic>): Promise<void> {
  const snakeData = toSnake(data);
  const { error } = await supabase
    .from("topics")
    .update({ ...snakeData, updated_at: Date.now() })
    .eq("course_id", courseId)
    .eq("id", topicId);

  if (error) throw new Error(error.message);
}

export async function deleteTopic(courseId: string, topicId: string): Promise<void> {
  const { error } = await supabase
    .from("topics")
    .delete()
    .eq("course_id", courseId)
    .eq("id", topicId);

  if (error) throw new Error(error.message);
}

// ============ PROBLEMS ============

export async function getProblemsByTopic(courseId: string, topicId: string): Promise<Problem[]> {
  const { data, error } = await supabase
    .from("problems")
    .select("*")
    .eq("topic_id", topicId)
    .order("order", { ascending: true });

  if (error || !data) return [];
  return toCamel<Problem[]>(data);
}

/** Porsiyalab yuklash (lazy load) — offset dan boshlab limit ta misol */
export async function getProblemsByTopicPaged(
  courseId: string,
  topicId: string,
  offset: number,
  limit: number
): Promise<{ problems: Problem[]; total: number }> {
  // Jami sonni olish
  const { count } = await supabase
    .from("problems")
    .select("*", { count: "exact", head: true })
    .eq("topic_id", topicId);

  const { data, error } = await supabase
    .from("problems")
    .select("*")
    .eq("topic_id", topicId)
    .order("order", { ascending: true })
    .range(offset, offset + limit - 1);

  if (error || !data) return { problems: [], total: count ?? 0 };
  return { problems: toCamel<Problem[]>(data), total: count ?? 0 };
}

export async function createProblem(courseId: string, topicId: string, problem: Problem): Promise<void> {
  const snakeProblem = toSnake(problem);
  snakeProblem.topic_id = topicId;
  snakeProblem.course_id = courseId;

  const { error } = await supabase
    .from("problems")
    .upsert(snakeProblem);

  if (error) throw new Error(error.message);
}

export async function updateProblem(
  courseId: string,
  topicId: string,
  problemId: string,
  data: Partial<Problem>
): Promise<void> {
  const snakeData = toSnake(data);
  const { error } = await supabase
    .from("problems")
    .update(snakeData)
    .eq("topic_id", topicId)
    .eq("id", problemId);

  if (error) throw new Error(error.message);
}

export async function deleteProblem(courseId: string, topicId: string, problemId: string): Promise<void> {
  const { error } = await supabase
    .from("problems")
    .delete()
    .eq("topic_id", topicId)
    .eq("id", problemId);

  if (error) throw new Error(error.message);
}

// ============ TESTS ============

export async function getTestsByCourse(courseId: string): Promise<Test[]> {
  const { data, error } = await supabase
    .from("tests")
    .select("*")
    .eq("course_id", courseId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return toCamel<Test[]>(data);
}

export async function getTestById(courseId: string, testId: string): Promise<Test | null> {
  const { data, error } = await supabase
    .from("tests")
    .select("*")
    .eq("course_id", courseId)
    .eq("id", testId)
    .maybeSingle();

  if (error || !data) return null;
  return toCamel<Test>(data);
}

export async function createTest(courseId: string, test: Test): Promise<void> {
  const snakeTest = toSnake(test);
  snakeTest.course_id = courseId;
  if (snakeTest.created_by) {
    snakeTest.created_by = stringToUUID(snakeTest.created_by);
  }

  const { error } = await supabase
    .from("tests")
    .upsert(snakeTest);

  if (error) throw new Error(error.message);
}

export async function updateTest(courseId: string, testId: string, data: Partial<Test>): Promise<void> {
  const snakeData = toSnake(data);
  const { error } = await supabase
    .from("tests")
    .update({ ...snakeData, updated_at: Date.now() })
    .eq("course_id", courseId)
    .eq("id", testId);

  if (error) throw new Error(error.message);
}

export async function deleteTest(courseId: string, testId: string): Promise<void> {
  const { error } = await supabase
    .from("tests")
    .delete()
    .eq("course_id", courseId)
    .eq("id", testId);

  if (error) throw new Error(error.message);
}

// ============ TEST LIBRARY (Mapped to settings key-value store) ============

export async function getAllLibraryTests(): Promise<Test[]> {
  return getSettingsArray<Test>("testLibrary");
}

export async function saveTestToLibrary(test: Test): Promise<void> {
  const list = await getSettingsArray<Test>("testLibrary");
  const index = list.findIndex(t => t.id === test.id);
  if (index > -1) {
    list[index] = test;
  } else {
    list.push(test);
  }
  await saveSettingsArray("testLibrary", list);
}

export async function updateLibraryTest(testId: string, data: Partial<Test>): Promise<void> {
  const list = await getSettingsArray<Test>("testLibrary");
  const index = list.findIndex(t => t.id === testId);
  if (index > -1) {
    list[index] = { ...list[index], ...data, updatedAt: Date.now() };
    await saveSettingsArray("testLibrary", list);
  }
}

export async function deleteLibraryTest(testId: string): Promise<void> {
  const list = await getSettingsArray<Test>("testLibrary");
  await saveSettingsArray("testLibrary", list.filter(t => t.id !== testId));
}

// ============ TEST BUILDER (Mapped to settings key-value store) ============

export async function getAllTBQuestions(): Promise<any[]> {
  return getSettingsArray<any>("testBuilderQuestions");
}

export async function saveTBQuestion(question: any): Promise<void> {
  const list = await getSettingsArray<any>("testBuilderQuestions");
  const index = list.findIndex(q => q.id === question.id);
  if (index > -1) {
    list[index] = question;
  } else {
    list.push(question);
  }
  await saveSettingsArray("testBuilderQuestions", list);
}

export async function deleteTBQuestion(questionId: string): Promise<void> {
  const list = await getSettingsArray<any>("testBuilderQuestions");
  await saveSettingsArray("testBuilderQuestions", list.filter(q => q.id !== questionId));
}

export async function getAllTBFolders(): Promise<any[]> {
  return getSettingsArray<any>("testBuilderFolders");
}

export async function saveTBFolder(folder: any): Promise<void> {
  const list = await getSettingsArray<any>("testBuilderFolders");
  const index = list.findIndex(f => f.id === folder.id);
  if (index > -1) {
    list[index] = folder;
  } else {
    list.push(folder);
  }
  await saveSettingsArray("testBuilderFolders", list);
}

export async function deleteTBFolder(folderId: string): Promise<void> {
  const list = await getSettingsArray<any>("testBuilderFolders");
  await saveSettingsArray("testBuilderFolders", list.filter(f => f.id !== folderId));
}

// Auto-organization helper
export async function organizeGeneralTestLibrary(): Promise<{ movedCount: number }> {
  try {
    const [folders, questions, courses] = await Promise.all([
      getAllTBFolders(),
      getAllTBQuestions(),
      getAllCourses(),
    ]);

    if (courses.length === 0 || questions.length === 0) {
      return { movedCount: 0 };
    }

    type ProblemMeta = {
      courseId: string;
      courseTitle: string;
      folderId?: string;
      moduleTitle?: string;
      topicId: string;
      topicTitle: string;
    };

    const problemByIdMap = new Map<string, ProblemMeta>();
    const problemByContentMap = new Map<string, ProblemMeta>();
    const topicByIdMap = new Map<string, ProblemMeta>();

    for (const course of courses) {
      const [tList, mList] = await Promise.all([
        getTopicsByCourse(course.id),
        getFoldersByCourse(course.id),
      ]);

      const moduleMap = new Map(mList.map((m) => [m.id, m.title]));

      for (const topic of tList) {
        const moduleTitle = topic.folderId ? moduleMap.get(topic.folderId) : undefined;
        const meta: ProblemMeta = {
          courseId: course.id,
          courseTitle: course.title,
          folderId: topic.folderId,
          moduleTitle,
          topicId: topic.id,
          topicTitle: topic.title,
        };

        topicByIdMap.set(topic.id, meta);

        try {
          const problems = await getProblemsByTopic(course.id, topic.id);
          for (const prob of problems) {
            problemByIdMap.set(prob.id, meta);
            if (prob.content) {
              problemByContentMap.set(prob.content.trim().toLowerCase(), meta);
            }
          }
        } catch {
          // Ignore problems errors
        }
      }
    }

    const folderMap = new Map<string, any>(folders.map((f) => [f.id, { ...f }]));

    async function ensureFolder(name: string, parentId: string | null, refKey: string): Promise<any> {
      const id = `tbf-${refKey}`;
      let f = folderMap.get(id);
      if (!f) {
        for (const existing of folderMap.values()) {
          if (
            existing.refKey === refKey ||
            ((existing.parentId ?? null) === parentId && existing.name?.trim().toLowerCase() === name.trim().toLowerCase())
          ) {
            f = existing;
            break;
          }
        }
      }

      if (f) {
        let updated = false;
        if (!f.refKey) { f.refKey = refKey; updated = true; }
        if ((f.parentId ?? null) !== parentId) { f.parentId = parentId; updated = true; }
        if (f.name !== name) { f.name = name; updated = true; }
        if (updated) {
          folderMap.set(f.id, f);
          await saveTBFolder(f);
        }
        return f;
      }

      const newF = {
        id,
        name,
        parentId: parentId ?? null,
        refKey,
        questionIds: [],
      };
      folderMap.set(id, newF);
      await saveTBFolder(newF);
      return newF;
    }

    let movedCount = 0;

    for (const q of questions) {
      const cleanContent = q.content ? q.content.trim().toLowerCase() : "";
      
      let meta: ProblemMeta | undefined =
        (q.problemId ? problemByIdMap.get(q.problemId) : undefined) ||
        problemByContentMap.get(cleanContent) ||
        (q.topicId ? topicByIdMap.get(q.topicId) : undefined);

      if (!meta && courses.length > 0) {
        const firstCourse = courses[0];
        const firstTopicMeta = Array.from(topicByIdMap.values())[0];
        if (firstTopicMeta) {
          meta = firstTopicMeta;
        } else {
          meta = {
            courseId: firstCourse.id,
            courseTitle: firstCourse.title,
            topicId: "default-topic",
            topicTitle: "Mavzu 1",
          };
        }
      }

      if (!meta) continue;

      const courseFolder = await ensureFolder(meta.courseTitle, null, `c-${meta.courseId}`);
      let targetFolder = courseFolder;

      if (meta.topicTitle) {
        if (meta.folderId && meta.moduleTitle) {
          const moduleFolder = await ensureFolder(
            meta.moduleTitle,
            courseFolder.id,
            `m-${meta.courseId}-${meta.folderId}`
          );
          targetFolder = await ensureFolder(
            meta.topicTitle,
            moduleFolder.id,
            `t-${meta.courseId}-${meta.topicId}`
          );
        } else {
          targetFolder = await ensureFolder(
            meta.topicTitle,
            courseFolder.id,
            `t-${meta.courseId}-${meta.topicId}`
          );
        }
      }

      let qUpdated = false;
      if (q.folderId !== targetFolder.id) {
        q.folderId = targetFolder.id;
        qUpdated = true;
      }

      const qIds: string[] = targetFolder.questionIds || [];
      if (!qIds.includes(q.id)) {
        targetFolder.questionIds = [...qIds, q.id];
        await saveTBFolder(targetFolder);
        folderMap.set(targetFolder.id, targetFolder);
        qUpdated = true;
      }

      if (qUpdated) {
        await saveTBQuestion(q);
        movedCount++;
      }
    }

    for (const f of folderMap.values()) {
      if (f.name?.trim().toLowerCase() === "umumiy" || f.refKey === "general") {
        await deleteTBFolder(f.id);
      }
    }

    return { movedCount };
  } catch (err) {
    console.error("organizeGeneralTestLibrary error:", err);
    return { movedCount: 0 };
  }
}

// ============ ADVICE (Maslahat bloklari) ============

export async function getAdviceByCourse(courseId: string): Promise<Advice[]> {
  const { data, error } = await supabase
    .from("advices")
    .select("*")
    .eq("course_id", courseId)
    .order("after_topic_order", { ascending: true });

  if (error || !data) return [];
  return toCamel<Advice[]>(data);
}

export async function createAdvice(courseId: string, advice: Advice): Promise<void> {
  const snakeAdvice = toSnake(advice);
  snakeAdvice.course_id = courseId;

  const { error } = await supabase
    .from("advices")
    .upsert(snakeAdvice);

  if (error) throw new Error(error.message);
}

export async function updateAdvice(courseId: string, adviceId: string, data: Partial<Advice>): Promise<void> {
  const snakeData = toSnake(data);
  const { error } = await supabase
    .from("advices")
    .update({ ...snakeData, updated_at: Date.now() })
    .eq("course_id", courseId)
    .eq("id", adviceId);

  if (error) throw new Error(error.message);
}

export async function deleteAdvice(courseId: string, adviceId: string): Promise<void> {
  const { error } = await supabase
    .from("advices")
    .delete()
    .eq("course_id", courseId)
    .eq("id", adviceId);

  if (error) throw new Error(error.message);
}

// ============ MOTIVATIONAL PHRASES ============

export async function getMotivationPhrases(placement: MotivationPlacement): Promise<MotivationalPhrase[]> {
  const { data, error } = await supabase
    .from("motivational_phrases")
    .select("*")
    .eq("placement", placement)
    .order("order", { ascending: true });

  if (error || !data) return [];
  return toCamel<MotivationalPhrase[]>(data);
}

export async function createMotivationPhrase(phrase: MotivationalPhrase): Promise<void> {
  const snakePhrase = toSnake(phrase);
  const { error } = await supabase
    .from("motivational_phrases")
    .upsert(snakePhrase);

  if (error) throw new Error(error.message);
}

export async function updateMotivationPhrase(phraseId: string, data: Partial<MotivationalPhrase>): Promise<void> {
  const snakeData = toSnake(data);
  const { error } = await supabase
    .from("motivational_phrases")
    .update(snakeData)
    .eq("id", phraseId);

  if (error) throw new Error(error.message);
}

export async function deleteMotivationPhrase(phraseId: string): Promise<void> {
  const { error } = await supabase
    .from("motivational_phrases")
    .delete()
    .eq("id", phraseId);

  if (error) throw new Error(error.message);
}

export async function getMotivationSettings(placement: MotivationPlacement): Promise<MotivationSettings | null> {
  const { data, error } = await supabase
    .from("motivation_settings")
    .select("*")
    .eq("placement", placement)
    .maybeSingle();

  if (error || !data) return null;
  return toCamel<MotivationSettings>(data);
}

export async function saveMotivationSettings(settings: MotivationSettings): Promise<void> {
  const snakeSettings = toSnake(settings);
  const { error } = await supabase
    .from("motivation_settings")
    .upsert(snakeSettings);

  if (error) throw new Error(error.message);
}

// ============ SOCIAL LINKS ============

export async function getAllSocialLinks(): Promise<SocialLink[]> {
  const { data, error } = await supabase
    .from("social_links")
    .select("*")
    .is("course_id", null)
    .order("order", { ascending: true });

  if (error || !data) return [];
  return toCamel<SocialLink[]>(data);
}

export async function getActiveSocialLinks(): Promise<SocialLink[]> {
  const { data, error } = await supabase
    .from("social_links")
    .select("*")
    .is("course_id", null)
    .eq("is_active", true)
    .order("order", { ascending: true });

  if (error || !data) return [];
  return toCamel<SocialLink[]>(data);
}

export async function createSocialLink(link: SocialLink): Promise<void> {
  const snakeLink = toSnake(link);
  const { error } = await supabase
    .from("social_links")
    .upsert(snakeLink);

  if (error) throw new Error(error.message);
}

export async function updateSocialLink(linkId: string, data: Partial<SocialLink>): Promise<void> {
  const snakeData = toSnake(data);
  const { error } = await supabase
    .from("social_links")
    .update({ ...snakeData, updated_at: Date.now() })
    .eq("id", linkId);

  if (error) throw new Error(error.message);
}

export async function deleteSocialLink(linkId: string): Promise<void> {
  const { error } = await supabase
    .from("social_links")
    .delete()
    .eq("id", linkId);

  if (error) throw new Error(error.message);
}

// ============ COURSE SOCIAL LINKS ============

export async function getCourseSocialLinks(courseId: string): Promise<SocialLink[]> {
  const { data, error } = await supabase
    .from("social_links")
    .select("*")
    .eq("course_id", courseId)
    .order("order", { ascending: true });

  if (error || !data) return [];
  return toCamel<SocialLink[]>(data);
}

export async function getActiveCourseLinks(courseId: string): Promise<SocialLink[]> {
  const { data, error } = await supabase
    .from("social_links")
    .select("*")
    .eq("course_id", courseId)
    .eq("is_active", true)
    .order("order", { ascending: true });

  if (error || !data) return [];
  return toCamel<SocialLink[]>(data);
}

export async function createCourseSocialLink(courseId: string, link: SocialLink): Promise<void> {
  const snakeLink = toSnake(link);
  snakeLink.course_id = courseId;

  const { error } = await supabase
    .from("social_links")
    .upsert(snakeLink);

  if (error) throw new Error(error.message);
}

export async function updateCourseSocialLink(courseId: string, linkId: string, data: Partial<SocialLink>): Promise<void> {
  const snakeData = toSnake(data);
  const { error } = await supabase
    .from("social_links")
    .update({ ...snakeData, updated_at: Date.now() })
    .eq("course_id", courseId)
    .eq("id", linkId);

  if (error) throw new Error(error.message);
}

export async function deleteCourseSocialLink(courseId: string, linkId: string): Promise<void> {
  const { error } = await supabase
    .from("social_links")
    .delete()
    .eq("course_id", courseId)
    .eq("id", linkId);

  if (error) throw new Error(error.message);
}

// ============ PROMO CODES ============

export async function getAllPromoCodes(): Promise<PromoCode[]> {
  const { data, error } = await supabase
    .from("promo_codes")
    .select("*");

  if (error || !data) return [];
  return toCamel<PromoCode[]>(data);
}

export async function getPromoByCode(code: string): Promise<PromoCode | null> {
  const { data, error } = await supabase
    .from("promo_codes")
    .select("*")
    .eq("code", code.toUpperCase())
    .maybeSingle();

  if (error || !data) return null;
  return toCamel<PromoCode>(data);
}

export async function createPromoCode(promo: PromoCode): Promise<void> {
  const snakePromo = toSnake(promo);
  if (snakePromo.created_by) {
    snakePromo.created_by = stringToUUID(snakePromo.created_by);
  }

  const { error } = await supabase
    .from("promo_codes")
    .upsert(snakePromo);

  if (error) throw new Error(error.message);
}

export async function updatePromoCode(promoId: string, data: Partial<PromoCode>): Promise<void> {
  const snakeData = toSnake(data);
  const { error } = await supabase
    .from("promo_codes")
    .update(snakeData)
    .eq("id", promoId);

  if (error) throw new Error(error.message);
}

export async function usePromoCodeAtomic(promoId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("promo_codes")
    .select("is_active, max_uses, used_count")
    .eq("id", promoId)
    .maybeSingle();

  if (error || !data) return false;
  if (!data.is_active) return false;
  if (data.max_uses > 0 && data.used_count >= data.max_uses) return false;

  const { error: updErr } = await supabase
    .from("promo_codes")
    .update({ used_count: (data.used_count || 0) + 1 })
    .eq("id", promoId);

  return !updErr;
}

export async function deletePromoCode(promoId: string): Promise<void> {
  const { error } = await supabase
    .from("promo_codes")
    .delete()
    .eq("id", promoId);

  if (error) throw new Error(error.message);
}
