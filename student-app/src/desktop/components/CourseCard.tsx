import { Link } from "react-router-dom";
import { Users, BookMarked, Clock, ArrowRight } from "lucide-react";
import type { Course } from "@shared/types";
import { resolveCourseCover } from "../utils/responsiveImage";
import { Chip, PremiumBadge, ProgressBar } from "./ui";

export interface CourseCardData extends Course {
  topicCount?: number;
  studentCount?: number;
  progress?: number;
}

/**
 * Desktop kurs kartochkasi.
 *
 * Mobil versiyaga nisbatan:
 *  - Muqova rasmi ancha katta (16:9, 1600×900 px tavsiya etiladi)
 *  - Hoverda ko'tariladi va rasm yumshoq zoom bo'ladi
 *  - Statistika chiplari va progress bir qatorda kengroq joylashadi
 */
export default function CourseCard({
  course,
  priority = false,
}: {
  course: CourseCardData;
  priority?: boolean;
}) {
  const cover = resolveCourseCover(course);
  const progress = Math.min(100, Math.max(0, Math.round(course.progress || 0)));

  return (
    <Link
      to={`/course/${course.id}`}
      className="dk-card dk-card-hover group flex flex-col overflow-hidden h-full"
    >
      {/* Muqova */}
      <div className="relative dk-zoom-wrap" style={{ aspectRatio: "16 / 9" }}>
        {cover.url ? (
          <img
            src={cover.url}
            alt={course.title}
            loading={priority ? "eager" : "lazy"}
            decoding="async"
            className="dk-zoom-img w-full h-full"
            style={{ objectFit: cover.objectFit, objectPosition: cover.objectPosition }}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary-400 via-primary-500 to-primary-700 grid place-items-center relative overflow-hidden">
            <span className="absolute -top-10 -right-8 w-40 h-40 rounded-full bg-white/10" />
            <span className="absolute -bottom-12 -left-8 w-36 h-36 rounded-full bg-white/5" />
            <BookMarked size={44} className="text-white/85 relative z-10" strokeWidth={1.5} />
          </div>
        )}

        {/* Pastdan gradient — chiplar o'qilishi uchun */}
        <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/45 to-transparent pointer-events-none" />

        {course.isPremium && <span className="absolute top-4 right-4 z-10"><PremiumBadge /></span>}
        {course.category && (
          <span className="absolute bottom-4 left-4 z-10">
            <Chip tone="glass" className="shadow-lg">{course.category}</Chip>
          </span>
        )}
      </div>

      {/* Matn qismi */}
      <div className="p-6 flex flex-col flex-1">
        <h3 className="text-[19px] font-extrabold text-gray-900 leading-snug tracking-tight dk-clamp-2 transition-colors group-hover:text-primary-600">
          {course.title}
        </h3>

        {course.description && (
          <p className="text-[13.5px] text-gray-500 leading-relaxed mt-2 dk-clamp-2">{course.description}</p>
        )}

        {/* Statistika */}
        <div className="flex items-center flex-wrap gap-2 mt-4">
          <Chip>
            <BookMarked size={13} /> {course.topicCount ?? 0} mavzu
          </Chip>
          <Chip>
            <Users size={13} /> {(course.studentCount ?? course.totalStudents ?? 0).toLocaleString()}
          </Chip>
          <Chip tone="green">
            <span className="relative flex w-1.5 h-1.5">
              <span className="absolute inline-flex w-full h-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
              <span className="relative inline-flex w-1.5 h-1.5 rounded-full bg-emerald-500" />
            </span>
            {course.onlineNow || 0} onlayn
          </Chip>
        </div>

        {/* Progress — pastga yopishtirilgan */}
        <div className="mt-auto pt-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[12px] font-medium text-gray-500 flex items-center gap-1.5">
              <Clock size={13} className="text-gray-400" />
              {progress > 0 ? "Jarayonda" : "Boshlang"}
            </span>
            <span className="text-[15px] font-extrabold text-primary-600 tabular-nums">{progress}%</span>
          </div>
          <ProgressBar value={progress} />
          <span className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-bold text-primary-600 transition-all group-hover:gap-3">
            {progress > 0 ? "Davom ettirish" : "Kursni ko'rish"}
            <ArrowRight size={15} />
          </span>
        </div>
      </div>
    </Link>
  );
}

/** Kartochka yuklanayotgan holati */
export function CourseCardSkeleton() {
  return (
    <div className="dk-card overflow-hidden h-full">
      <div className="dk-skeleton w-full rounded-none" style={{ aspectRatio: "16 / 9" }} />
      <div className="p-6 space-y-3">
        <div className="dk-skeleton h-5 w-4/5" />
        <div className="dk-skeleton h-3.5 w-full" />
        <div className="dk-skeleton h-3.5 w-3/5" />
        <div className="flex gap-2 pt-2">
          <div className="dk-skeleton h-7 w-24 rounded-xl" />
          <div className="dk-skeleton h-7 w-20 rounded-xl" />
        </div>
        <div className="dk-skeleton h-2 w-full rounded-full mt-4" />
      </div>
    </div>
  );
}
