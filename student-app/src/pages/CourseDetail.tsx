import { Link, useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { getCourseById, getTopicsByCourse } from "@shared/repositories";
import type { Course, Topic } from "@shared/types";
import { Search, Bell, CheckCircle, Clock, Lock } from "lucide-react";

export default function CourseDetail() {
  const { courseId } = useParams<{ courseId: string }>();
  const [course, setCourse] = useState<Course | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!courseId) return;
    Promise.all([getCourseById(courseId), getTopicsByCourse(courseId)])
      .then(([c, t]) => { setCourse(c); setTopics(t); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [courseId]);

  if (loading) {
    return <div className="page-content flex items-center justify-center"><div className="w-8 h-8 border-3 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  const freeTopics = topics.filter(t => !t.isPremium).length;
  const progressPercent = topics.length > 0 ? Math.round((freeTopics / topics.length) * 100) : 0;

  return (
    <div className="page-content">
      {/* Header */}
      <header className="px-5 pt-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-900 truncate">{course?.title || "Kurs"}</h1>
        <div className="flex gap-3">
          <button className="text-gray-400"><Search size={20} /></button>
          <button className="text-gray-400"><Bell size={20} /></button>
        </div>
      </header>

      {/* Progress card */}
      <div className="mx-5 mt-4 bg-primary-500 rounded-2xl p-5">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center">
            <span className="text-white">📖</span>
          </div>
          <div>
            <p className="text-white font-bold">{course?.title}</p>
            <p className="text-white/70 text-[10px]">OVERALL PROGRESS</p>
          </div>
        </div>
        <p className="text-white text-3xl font-bold">{progressPercent}%</p>
        <div className="flex items-center mt-2">
          <div className="flex-1 h-2 bg-white/20 rounded-full">
            <div className="h-full bg-white rounded-full transition-all" style={{ width: `${progressPercent}%` }} />
          </div>
          <span className="text-white/80 text-xs ml-3">{freeTopics} / {topics.length} Lessons</span>
        </div>
      </div>

      {/* Topics */}
      <div className="px-5 mt-6 flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold">Topics</h3>
        <button className="text-sm text-primary-500 font-medium">View All</button>
      </div>

      <div className="px-5 space-y-3">
        {topics.map((topic, i) => {
          // Qulf faqat premium mavzularda ko'rsatiladi (admin belgilaydi)
          const isLocked = topic.isPremium;
          const topicProgress = isLocked ? 0 : (i < 3 ? 100 : i === 3 ? 65 : 0);
          const isDone = !isLocked && topicProgress === 100;
          const isProgress = !isLocked && !isDone && topicProgress > 0;

          return (
            <Link
              to={isLocked ? "/premium-gate" : `/course/${courseId}/topic/${topic.id}`}
              key={topic.id}
              className="flex items-center border border-gray-100 rounded-xl p-4 gap-3 hover:shadow-sm transition-shadow"
            >
              <div className="w-11 h-11 bg-primary-50 rounded-xl flex items-center justify-center shrink-0">
                {isDone && <CheckCircle size={20} className="text-primary-500" />}
                {isProgress && <Clock size={20} className="text-primary-500" />}
                {isLocked && <Lock size={18} className="text-gray-400" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-gray-900 text-sm truncate">{topic.title}</p>
                  {isDone && <span className="text-green-500 text-xs">✓</span>}
                </div>
                <p className="text-xs text-gray-500 truncate">{topic.description}</p>
                <div className="flex items-center mt-1.5">
                  <span className="text-[10px] text-gray-400 uppercase mr-2">Progress</span>
                  <div className="flex-1 h-1 bg-gray-100 rounded-full">
                    <div className="h-full bg-primary-500 rounded-full" style={{ width: `${topicProgress}%` }} />
                  </div>
                  <span className="text-xs font-medium text-gray-600 ml-2">{topicProgress}%</span>
                </div>
              </div>
              <span className="text-gray-400">›</span>
            </Link>
          );
        })}
      </div>

      {/* Daily Quiz */}
      <div className="mx-5 mt-6 bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
        <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center shrink-0">
          <span className="text-white text-sm">✓</span>
        </div>
        <div>
          <p className="font-semibold text-gray-900 text-sm">Daily Quiz Available!</p>
          <p className="text-xs text-gray-500">Complete today's challenge to earn 50 XP.</p>
        </div>
      </div>
    </div>
  );
}
