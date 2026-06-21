import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

/**
 * Sahifalar orasida o'tishda ko'rinadigan loader animatsiya.
 * Yuqori qismda progress bar + ekranda spinner ko'rsatadi.
 */
export function NavigationLoader() {
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    setLoading(true);
    setProgress(30);

    const t1 = setTimeout(() => setProgress(60), 100);
    const t2 = setTimeout(() => setProgress(90), 200);
    const t3 = setTimeout(() => {
      setProgress(100);
      setTimeout(() => setLoading(false), 150);
    }, 350);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [location.pathname]);

  if (!loading) return null;

  return (
    <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-mobile z-[9999]">
      <div
        className="h-[3px] bg-primary-500 transition-all duration-200 ease-out rounded-full"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

/**
 * Suspense fallback — sahifa lazy-load bo'layotganda ko'rinadi
 */
export function SuspenseLoader() {
  return (
    <div className="page-content flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-3 border-primary-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-400 animate-pulse">Yuklanmoqda...</p>
      </div>
    </div>
  );
}
