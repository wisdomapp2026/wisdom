import { useEffect, useState, useCallback } from "react";
import { X, Maximize2, Minimize2 } from "lucide-react";

interface Props {
  open: boolean;
  videoUrl: string;
  onClose: () => void;
}

/**
 * Video Player — To'liq ekranda ochiladi (portret rejim).
 * YouTube kontrollarini ko'rsatadi.
 * Kattalashtirish bosilganda albom (landscape) rejimga o'tadi.
 * X yoki Back tugmasi bosilganda video yopiladi.
 */
export default function VideoModal({ open, videoUrl, onClose }: Props) {
  const [isLandscape, setIsLandscape] = useState(false);

  // Back tugmasi (browser) bilan yopish
  useEffect(() => {
    if (!open) return;

    // History state qo'shish — back bosilganda popup yopilsin
    window.history.pushState({ videoOpen: true }, "");

    function handlePopState(e: PopStateEvent) {
      onClose();
    }

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [open, onClose]);

  // Landscape rejimda screen orientation lock qilish (agar API mavjud bo'lsa)
  useEffect(() => {
    if (!open) return;

    if (isLandscape && (screen as any).orientation?.lock) {
      (screen as any).orientation.lock("landscape").catch(() => {});
      return () => {
        (screen as any).orientation?.unlock?.();
      };
    } else if (!isLandscape && (screen as any).orientation?.unlock) {
      (screen as any).orientation.unlock();
    }
  }, [isLandscape, open]);

  // ESC bilan yopish (desktop)
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (isLandscape) {
          setIsLandscape(false);
        } else {
          onClose();
        }
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, isLandscape, onClose]);

  if (!open || !videoUrl) return null;

  // YouTube URL ni embed formatga o'girish — kontrollar yoqilgan
  function getEmbedUrl(url: string): string {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
    if (match) {
      return `https://www.youtube-nocookie.com/embed/${match[1]}?autoplay=1&controls=1&modestbranding=1&rel=0&playsinline=1&fs=1`;
    }
    return url;
  }

  function isYouTube(url: string): boolean {
    return url.includes("youtube.com") || url.includes("youtu.be");
  }

  function handleClose() {
    setIsLandscape(false);
    // History state ni orqaga qaytarish
    if (window.history.state?.videoOpen) {
      window.history.back();
    } else {
      onClose();
    }
  }

  function toggleLandscape() {
    setIsLandscape((prev) => !prev);
  }

  return (
    <div
      className={`fixed inset-0 z-[100] bg-black flex flex-col ${
        isLandscape ? "landscape-video" : ""
      }`}
      style={isLandscape ? { transform: "rotate(90deg)", transformOrigin: "center center", width: "100vh", height: "100vw", position: "fixed", top: "50%", left: "50%", marginTop: "calc(-50vw)", marginLeft: "calc(-50vh)" } : undefined}
    >
      {/* Header — yopish va kattalashtirish tugmalari */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/90 z-10 shrink-0">
        <button
          onClick={handleClose}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 active:bg-white/20 transition-colors"
          aria-label="Yopish"
        >
          <X size={20} className="text-white" />
        </button>

        <p className="text-white/70 text-sm font-medium">🎬 Video</p>

        <button
          onClick={toggleLandscape}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 active:bg-white/20 transition-colors"
          aria-label={isLandscape ? "Kichraytirish" : "Kattalashtirish"}
        >
          {isLandscape ? (
            <Minimize2 size={18} className="text-white" />
          ) : (
            <Maximize2 size={18} className="text-white" />
          )}
        </button>
      </div>

      {/* Video container */}
      <div className="flex-1 flex items-center justify-center bg-black overflow-hidden">
        <div className={`w-full ${isLandscape ? "h-full" : "aspect-video max-h-[60vh]"}`}>
          {isYouTube(videoUrl) ? (
            <iframe
              src={getEmbedUrl(videoUrl)}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              allowFullScreen
              style={{ border: "none" }}
            />
          ) : (
            <video
              src={videoUrl}
              controls
              autoPlay
              playsInline
              className="w-full h-full object-contain"
            />
          )}
        </div>
      </div>

      {/* Portret rejimda pastdan ko'rsatma */}
      {!isLandscape && (
        <div className="px-4 py-4 bg-black/90 shrink-0">
          <button
            onClick={toggleLandscape}
            className="w-full py-3 bg-white/10 rounded-xl flex items-center justify-center gap-2 active:bg-white/20 transition-colors"
          >
            <Maximize2 size={16} className="text-white/80" />
            <span className="text-white/80 text-sm font-medium">To'liq ekranda ko'rish</span>
          </button>
        </div>
      )}
    </div>
  );
}
