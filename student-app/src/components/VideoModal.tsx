import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Maximize2, Minimize2 } from "lucide-react";
import { useIsDesktop } from "../desktop/hooks/useIsDesktop";

interface Props {
  open: boolean;
  videoUrl: string;
  onClose: () => void;
}

/**
 * Video Player Modal — ekran markazida ochiladi.
 * YouTube videolarni iframe embed orqali ko'rsatadi (IFrame API o'rniga).
 * Bu yondashuv localhost'dagi postMessage/origin muammolarini yo'q qiladi.
 */
export default function VideoModal({ open, videoUrl, onClose }: Props) {
  const [isLandscape, setIsLandscape] = useState(false);
  const isDesktop = useIsDesktop();

  // Body scroll bloklanishi
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // Back tugmasi (browser) bilan yopish
  useEffect(() => {
    if (!open) return;
    window.history.pushState({ videoOpen: true }, "");
    let closedByPop = false;
    function handlePopState() { closedByPop = true; onClose(); }
    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
      if (!closedByPop && window.history.state?.videoOpen) window.history.back();
    };
  }, [open, onClose]);

  // Landscape rejimda screen orientation lock
  useEffect(() => {
    if (!open) return;
    if (isLandscape && (screen as any).orientation?.lock) {
      (screen as any).orientation.lock("landscape").catch(() => {});
      return () => { (screen as any).orientation?.unlock?.(); };
    } else if (!isLandscape && (screen as any).orientation?.unlock) {
      (screen as any).orientation.unlock();
    }
  }, [isLandscape, open]);

  // ESC bilan yopish
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (isLandscape) setIsLandscape(false);
        else onClose();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, isLandscape, onClose]);

  if (!open || !videoUrl) return null;

  function handleClose() {
    setIsLandscape(false);
    onClose();
  }

  function toggleLandscape() {
    setIsLandscape((prev) => !prev);
  }

  const isYT = videoUrl.includes("youtube.com") || videoUrl.includes("youtu.be");
  const embedSrc = isYT ? getYouTubeEmbedUrl(videoUrl) : "";

  return createPortal(
    <div
      className={`fixed inset-0 z-[200] bg-black/95 flex flex-col items-center justify-center ${
        isLandscape && !isDesktop ? "landscape-video" : ""
      }`}
      style={isLandscape && !isDesktop ? {
        transform: "rotate(90deg)",
        transformOrigin: "center center",
        width: "100vh",
        height: "100vw",
        position: "fixed",
        top: "50%",
        left: "50%",
        marginTop: "calc(-50vw)",
        marginLeft: "calc(-50vh)",
      } : undefined}
    >
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-3 z-20 shrink-0">
        <button
          onClick={handleClose}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 backdrop-blur-sm active:bg-white/20 transition-colors"
          aria-label="Yopish"
        >
          <X size={20} className="text-white" />
        </button>

        <p className="text-white/70 text-sm font-medium">🎬 Video</p>

        <button
          onClick={toggleLandscape}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 backdrop-blur-sm active:bg-white/20 transition-colors"
          aria-label={isLandscape ? "Kichraytirish" : "Kattalashtirish"}
        >
          {isLandscape ? <Minimize2 size={18} className="text-white" /> : <Maximize2 size={18} className="text-white" />}
        </button>
      </div>

      {/* Video — ekran markazida */}
      <div
        className="w-full px-4"
        style={{
          maxWidth: (isLandscape && isDesktop) ? "100%" : isLandscape ? "100%" : "min(100%, 960px)",
          aspectRatio: "16 / 9",
          maxHeight: (isLandscape && isDesktop) ? "100vh" : isLandscape ? "100%" : "calc(100vh - 100px)",
        }}
      >
        {isYT ? (
          <iframe
            src={embedSrc}
            className="w-full h-full rounded-xl"
            style={{ border: "none" }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            title="Video player"
          />
        ) : (
          <video
            src={videoUrl}
            controls
            autoPlay
            playsInline
            className="w-full h-full object-contain rounded-xl"
          />
        )}
      </div>

      {/* Portret rejimda pastdan ko'rsatma */}
      {!isLandscape && (
        <div className="absolute bottom-0 left-0 right-0 px-4 py-4 z-20 shrink-0">
          <button
            onClick={toggleLandscape}
            className="w-full py-3 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center gap-2 active:bg-white/20 transition-colors"
          >
            <Maximize2 size={16} className="text-white/80" />
            <span className="text-white/80 text-sm font-medium">
              {isDesktop ? "Kengaytirilgan rejim" : "To'liq ekranda ko'rish"}
            </span>
          </button>
        </div>
      )}
    </div>,
    document.body
  );
}

/**
 * YouTube URL'dan embed URL hosil qilish.
 * start/end parametrlarini saqlaydi.
 */
function getYouTubeEmbedUrl(url: string): string {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]+)/);
  if (!match) return url;

  const videoId = match[1];
  const params = new URLSearchParams(url.includes("?") ? url.slice(url.indexOf("?") + 1) : "");

  const embedParams = new URLSearchParams({
    autoplay: "1",
    controls: "1",
    modestbranding: "1",
    rel: "0",
    playsinline: "1",
    fs: "1",
  });

  // start va end parametrlarini saqlash
  const startRaw = params.get("start") || params.get("t");
  const endRaw = params.get("end");
  if (startRaw) embedParams.set("start", String(toSeconds(startRaw) || 0));
  if (endRaw) embedParams.set("end", String(toSeconds(endRaw) || 0));

  return `https://www.youtube-nocookie.com/embed/${videoId}?${embedParams.toString()}`;
}

function toSeconds(value: string): number | null {
  if (!value) return null;
  if (/^\d+$/.test(value)) return Number(value);
  const m = value.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
  if (m && (m[1] || m[2] || m[3])) {
    return Number(m[1] || 0) * 3600 + Number(m[2] || 0) * 60 + Number(m[3] || 0);
  }
  return null;
}
