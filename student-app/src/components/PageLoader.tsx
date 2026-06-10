/**
 * Sahifa yuklanayotganda ko'rinadigan skeleton animatsiyasi
 * animate-pulse + gradient shimmer
 */

function Shimmer({ className }: { className?: string }) {
  return (
    <div
      className={`relative overflow-hidden rounded bg-gray-200 ${className || ""}`}
      style={{
        backgroundImage: "linear-gradient(90deg, #e5e7eb 0%, #f3f4f6 50%, #e5e7eb 100%)",
        backgroundSize: "200% 100%",
        animation: "shimmerMove 1.5s ease-in-out infinite",
      }}
    />
  );
}

export function HomeLoader() {
  return (
    <div className="page-content">
      <style>{`@keyframes shimmerMove { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
      {/* Header */}
      <div className="px-5 pt-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shimmer className="w-9 h-9 rounded-xl" />
          <Shimmer className="w-20 h-5 rounded-md" />
        </div>
        <div className="flex gap-3">
          <Shimmer className="w-8 h-8 rounded-full" />
          <Shimmer className="w-8 h-8 rounded-full" />
        </div>
      </div>
      {/* Banner */}
      <div className="mx-5 mt-4">
        <Shimmer className="w-full h-32 rounded-2xl" />
      </div>
      {/* Yangiliklar */}
      <div className="px-5 mt-6">
        <Shimmer className="w-24 h-4 rounded mb-3" />
        <div className="flex gap-3">
          <Shimmer className="w-36 h-28 rounded-xl shrink-0" />
          <Shimmer className="w-36 h-28 rounded-xl shrink-0" />
          <Shimmer className="w-36 h-28 rounded-xl shrink-0" />
        </div>
      </div>
      {/* Kurslar */}
      <div className="px-5 mt-6">
        <Shimmer className="w-20 h-4 rounded mb-3" />
        <div className="grid grid-cols-2 gap-3">
          <Shimmer className="h-44 rounded-xl" />
          <Shimmer className="h-44 rounded-xl" />
        </div>
      </div>
      {/* Davom etayotgan */}
      <div className="px-5 mt-6">
        <Shimmer className="w-44 h-4 rounded mb-3" />
        <Shimmer className="w-full h-16 rounded-xl" />
      </div>
    </div>
  );
}

export function CoursesLoader() {
  return (
    <div className="page-content">
      <style>{`@keyframes shimmerMove { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
      <div className="px-5 pt-4">
        <Shimmer className="w-24 h-7 rounded" />
      </div>
      <div className="mx-5 mt-3">
        <Shimmer className="w-full h-12 rounded-xl" />
      </div>
      <div className="px-5 mt-4 flex gap-2">
        <Shimmer className="w-20 h-8 rounded-full" />
        <Shimmer className="w-24 h-8 rounded-full" />
        <Shimmer className="w-28 h-8 rounded-full" />
      </div>
      <div className="px-5 mt-5">
        <Shimmer className="w-36 h-5 rounded mb-4" />
      </div>
      <div className="px-5 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="border border-gray-100 rounded-2xl p-5">
            <div className="flex items-start justify-between mb-4">
              <Shimmer className="w-14 h-14 rounded-2xl" />
              <Shimmer className="w-32 h-4 rounded" />
            </div>
            <Shimmer className="w-3/4 h-5 rounded mb-2" />
            <Shimmer className="w-full h-4 rounded mb-1" />
            <Shimmer className="w-2/3 h-4 rounded mb-4" />
            <Shimmer className="w-full h-2 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function TestsLoader() {
  return (
    <div className="page-content">
      <style>{`@keyframes shimmerMove { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
      <div className="px-5 pt-4 flex justify-between">
        <Shimmer className="w-20 h-7 rounded" />
        <Shimmer className="w-9 h-9 rounded-full" />
      </div>
      <div className="mx-5 mt-4">
        <Shimmer className="w-full h-28 rounded-2xl" />
      </div>
      <div className="mx-5 mt-4">
        <Shimmer className="w-full h-12 rounded-xl" />
      </div>
      <div className="px-5 mt-3 flex gap-2">
        <Shimmer className="w-20 h-8 rounded-full" />
        <Shimmer className="w-28 h-8 rounded-full" />
        <Shimmer className="w-24 h-8 rounded-full" />
      </div>
      <div className="px-5 mt-6">
        <Shimmer className="w-32 h-5 rounded mb-3" />
        <div className="flex gap-3">
          <Shimmer className="w-44 h-40 rounded-2xl shrink-0" />
          <Shimmer className="w-44 h-40 rounded-2xl shrink-0" />
        </div>
      </div>
      <div className="px-5 mt-6">
        <Shimmer className="w-32 h-5 rounded mb-3" />
        <Shimmer className="w-full h-28 rounded-xl mb-3" />
        <Shimmer className="w-full h-28 rounded-xl" />
      </div>
    </div>
  );
}

export function ContinueLoader() {
  return (
    <div className="page-content">
      <style>{`@keyframes shimmerMove { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
      <div className="px-5 pt-4">
        <Shimmer className="w-32 h-7 rounded" />
      </div>
      <div className="mx-5 mt-5">
        <Shimmer className="w-full h-40 rounded-2xl" />
      </div>
      <div className="px-5 mt-6">
        <Shimmer className="w-28 h-5 rounded mb-4" />
        <div className="space-y-4">
          <Shimmer className="w-full h-36 rounded-2xl" />
          <Shimmer className="w-full h-36 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
