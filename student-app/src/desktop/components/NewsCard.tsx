import { useEffect } from "react";
import { Play, FileText, X, Calendar, Clock } from "lucide-react";
import type { NewsItem } from "@shared/types";
import { resolveNewsImage, getYouTubeThumbnailHQ } from "../utils/responsiveImage";

/**
 * Desktop yangilik kartochkasi — mobil versiyadan kattaroq (w-64 vs w-32),
 * hoverda rasm zoom bo'ladi va video play tugmasi kattalashadi.
 */
export default function NewsCard({
  item,
  onOpen,
}: {
  item: NewsItem;
  onOpen: (item: NewsItem) => void;
}) {
  const thumb =
    resolveNewsImage(item) ||
    (item.type === "video" && item.videoUrl ? getYouTubeThumbnailHQ(item.videoUrl) : "");

  return (
    <button
      onClick={() => {
        if (item.type === "image" && item.linkUrl) {
          window.open(item.linkUrl, "_blank", "noopener,noreferrer");
        } else {
          onOpen(item);
        }
      }}
      className="dk-card dk-card-hover group shrink-0 w-[380px] flex flex-col text-left overflow-hidden"
      style={{ scrollSnapAlign: "start" }}
    >
      <div className="relative dk-zoom-wrap bg-gray-900" style={{ height: "260px" }}>
        {thumb ? (
          <img
            src={thumb}
            alt=""
            loading="lazy"
            decoding="async"
            className="dk-zoom-img w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900 grid place-items-center">
            {item.type === "video" ? (
              <Play size={30} className="text-white/80" fill="currentColor" />
            ) : (
              <FileText size={30} className="text-white/50" />
            )}
          </div>
        )}

        {item.type === "video" && (
          <div className="absolute inset-0 grid place-items-center bg-gradient-to-t from-black/55 via-transparent to-transparent">
            <span className="w-14 h-14 rounded-full bg-white/95 grid place-items-center shadow-2xl transition-transform duration-300 group-hover:scale-110">
              <Play size={20} className="text-primary-600 ml-0.5" fill="currentColor" />
            </span>
          </div>
        )}

        {item.duration && (
          <span className="absolute bottom-3 right-3 text-[11px] font-semibold text-white bg-black/70 backdrop-blur-sm px-2.5 py-1 rounded-full">
            {item.duration}
          </span>
        )}
      </div>

      <div className="p-4">
        <p className="text-[13.5px] font-bold text-gray-800 leading-snug dk-clamp-2 transition-colors group-hover:text-primary-600">
          {item.title}
        </p>
        <p className="text-[11px] text-gray-400 mt-2 flex items-center gap-1.5">
          <Calendar size={11} />
          {new Date(item.createdAt).toLocaleDateString("uz-UZ", { day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>
    </button>
  );
}

/* ============================================================
   Yangilik tafsilotlari modali — desktop uchun kengroq
   ============================================================ */
export function NewsModal({ item, onClose }: { item: NewsItem; onClose: () => void }) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  function embedUrl(url: string): string {
    const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
    return m
      ? `https://www.youtube-nocookie.com/embed/${m[1]}?autoplay=1&rel=0&modestbranding=1`
      : url;
  }

  const isVideo = item.type === "video" && !!item.videoUrl;
  const image = resolveNewsImage(item);

  return (
    <div
      className="fixed inset-0 z-[200] bg-gray-900/60 backdrop-blur-sm grid place-items-center p-6 dk-anim-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={item.title}
    >
      <div
        className="w-full rounded-3xl overflow-hidden shadow-2xl flex flex-col dk-anim-scale-in"
        style={{
          maxWidth: isVideo ? 1000 : 760,
          maxHeight: "88vh",
          backgroundColor: "var(--theme-card-bg)",
          border: "1px solid var(--dk-border)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between gap-4 px-7 py-5 shrink-0"
          style={{ borderBottom: "1px solid var(--dk-border)" }}
        >
          <h2 className="text-[19px] font-extrabold text-gray-900 dk-clamp-1">{item.title}</h2>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-2xl grid place-items-center bg-gray-100 text-gray-400 hover:text-gray-700 hover:bg-gray-200 transition-colors shrink-0"
            aria-label="Yopish"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto dk-scroll">
          {isVideo ? (
            <div className="bg-black" style={{ aspectRatio: "16 / 9" }}>
              {item.videoUrl!.includes("youtu") ? (
                <iframe
                  src={embedUrl(item.videoUrl!)}
                  className="w-full h-full"
                  title={item.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <video src={item.videoUrl} controls autoPlay className="w-full h-full" />
              )}
            </div>
          ) : (
            image && <img src={image} alt={item.title} className="w-full max-h-[52vh] object-contain bg-gray-50" />
          )}

          {item.body && (
            <div className="px-7 py-6">
              <p className="text-[15px] text-gray-700 leading-[1.75] whitespace-pre-wrap">{item.body}</p>
            </div>
          )}

          <div
            className="px-7 py-4 flex items-center gap-5 text-[12px] text-gray-400"
            style={{ borderTop: "1px solid var(--dk-border)" }}
          >
            <span className="flex items-center gap-1.5">
              <Calendar size={12} />
              {new Date(item.createdAt).toLocaleDateString("uz-UZ", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
            {item.duration && (
              <span className="flex items-center gap-1.5">
                <Clock size={12} /> {item.duration}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
