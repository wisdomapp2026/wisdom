import { Link } from "react-router-dom";
import { Users, BookMarked, ArrowRight } from "lucide-react";
import { resolveCourseCover } from "../utils/responsiveImage";
import { Chip, PremiumBadge, ProgressBar } from "./ui";
import type { CourseCardData } from "./CourseCard";

/**
 * Ro'yxat ko'rinishidagi kurs qatori — chapda katta muqova, o'ngda batafsil
 * ma'lumot. Kengroq ekranlarda kartochkadan ko'proq ma'lumot ko'rsatadi.
 */
export default function CourseListRow({ course }: { course: CourseCardData }) {
  const cover = resolveCourseCover(course);
  const progress = Math.min(100, Math.max(0, Math.round(course.progress || 0)));

  return (
    <Link
      to={`/course/${course.id}`}
      className="dk-card dk-card-hover group flex items-stretch overflow-hidden"
    >
      {/* Muqova */}
      <div className="relative dk-zoom-wrap shrink-0 w-[300px] self-stretch min-h-[172px]">
        {cover.url ? (
          <img
            src={cover.url}
            alt={course.title}
            loading="lazy"
            decoding="async"
            className="dk-zoom-img absolute inset-0 w-full h-full"
            style={{ objectFit: cover.objectFit, objectPosition: cover.objectPosition }}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary-400 to-primary-700 grid place-items-center">
            <BookMarked size={36} className="text-white/85" strokeWidth={1.5} />
          </div>
        )}
        {course.isPremium && (
          <span className="absolute top-3.5 left-3.5 z-10">
            <PremiumBadge />
          </span>
        )}
      </div>

      {/* Ma'lumot */}
      <div className="flex-1 min-w-0 p-6 flex flex-col">
        <div className="flex items-start gap-4">
          <div className="min-w-0 flex-1">
            {course.category && <Chip tone="primary">{course.category}</Chip>}
            <h3 className="text-[20px] font-extrabold text-gray-900 leading-snug tracking-tight mt-2 dk-clamp-1 group-hover:text-primary-600 transition-colors">
              {course.title}
            </h3>
            {course.description && (
              <p className="text-[13.5px] text-gray-500 leading-relaxed mt-1.5 dk-clamp-2">
                {course.description}
              </p>
            )}
          </div>

          {/* Progress raqami */}
          <div className="shrink-0 text-right">
            <p className="text-[26px] font-extrabold text-primary-600 leading-none tabular-nums">{progress}%</p>
            <p className="text-[11px] text-gray-400 mt-1">{progress > 0 ? "yakunlangan" : "boshlanmagan"}</p>
          </div>
        </div>

        {/* Pastki qator */}
        <div className="mt-auto pt-5 flex items-end gap-6">
          <div className="flex items-center gap-2 flex-wrap">
            <Chip>
              <BookMarked size={13} /> {course.topicCount ?? 0} mavzu
            </Chip>
            <Chip>
              <Users size={13} /> {(course.studentCount ?? 0).toLocaleString()} o'quvchi
            </Chip>
            <Chip tone="green">
              <span className="relative flex w-1.5 h-1.5">
                <span className="absolute inline-flex w-full h-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                <span className="relative inline-flex w-1.5 h-1.5 rounded-full bg-emerald-500" />
              </span>
              {course.onlineNow || 0} onlayn
            </Chip>
          </div>

          <div className="flex-1 min-w-[140px] max-w-sm">
            <ProgressBar value={progress} height={6} />
          </div>

          <span className="shrink-0 inline-flex items-center gap-1.5 text-[13px] font-bold text-primary-600 transition-all group-hover:gap-3">
            Ochish <ArrowRight size={15} />
          </span>
        </div>
      </div>
    </Link>
  );
}
