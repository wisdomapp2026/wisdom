import { useEffect, useState, useCallback, useRef } from "react";
import { X, Maximize2, Minimize2 } from "lucide-react";

interface Props {
  open: boolean;
  videoUrl: string;
  onClose: () => void;
}

// YouTube IFrame API global type
declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: (() => void) | undefined;
  }
}

/**
 * Video Player — To'liq ekranda ochiladi (portret rejim).
 * YouTube kontrollarini ko'rsatadi.
 * End time ga yetganda video pause bo'ladi (modal yopilmaydi).
 */
export default function VideoModal({ open, videoUrl, onClose }: Props) {
  const [isLandscape, setIsLandscape] = useState(false);
  const playerRef = useRef<any>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Back tugmasi (browser) bilan yopish
  useEffect(() => {
    if (!open) return;

    window.history.pushState({ videoOpen: true }, "");
    let closedByPop = false;

    function handlePopState() {
      closedByPop = true;
      onClose();
    }

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
      if (!closedByPop && window.history.state?.videoOpen) {
        window.history.back();
      }
    };
  }, [open, onClose]);

  // Landscape rejimda screen orientation lock
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

  // YouTube IFrame API yuklash
  useEffect(() => {
    if (!open || !videoUrl || !isYouTube(videoUrl)) return;

    // API allaqachon yuklangan bo'lsa — player yaratish
    if (window.YT && window.YT.Player) {
      createPlayer();
      return;
    }

    // API yuklash
    if (!document.getElementById("yt-iframe-api")) {
      const tag = document.createElement("script");
      tag.id = "yt-iframe-api";
      tag.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(tag);
    }

    window.onYouTubeIframeAPIReady = () => {
      createPlayer();
    };

    return () => {
      cleanupPlayer();
    };
  }, [open, videoUrl]);

  function cleanupPlayer() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (playerRef.current) {
      try { playerRef.current.destroy(); } catch {}
      playerRef.current = null;
    }
  }

  function createPlayer() {
    if (!containerRef.current || playerRef.current) return;

    const { videoId, start, end } = parseYouTubeUrl(videoUrl);
    if (!videoId) return;

    // Player container div yaratish
    const playerDiv = document.createElement("div");
    playerDiv.id = "yt-player-" + Date.now();
    containerRef.current.innerHTML = "";
    containerRef.current.appendChild(playerDiv);

    playerRef.current = new window.YT.Player(playerDiv.id, {
      videoId,
      playerVars: {
        autoplay: 1,
        controls: 1,
        modestbranding: 1,
        rel: 0,
        playsinline: 1,
        fs: 1,
        start: start ?? undefined,
      },
      events: {
        onReady: (event: any) => {
          // End time bo'lsa — interval bilan kuzatish
          if (end != null) {
            intervalRef.current = setInterval(() => {
              try {
                const currentTime = event.target.getCurrentTime();
                if (currentTime >= end) {
                  event.target.pauseVideo();
                  event.target.seekTo(end, true);
                  if (intervalRef.current) {
                    clearInterval(intervalRef.current);
                    intervalRef.current = null;
                  }
                }
              } catch {}
            }, 500);
          }
        },
        onStateChange: (event: any) => {
          // Video qayta o'ynab ketganda ham end time ni kuzatish
          if (end != null && event.data === 1) { // 1 = playing
            if (!intervalRef.current) {
              intervalRef.current = setInterval(() => {
                try {
                  const currentTime = event.target.getCurrentTime();
                  if (currentTime >= end) {
                    event.target.pauseVideo();
                    event.target.seekTo(end, true);
                    if (intervalRef.current) {
                      clearInterval(intervalRef.current);
                      intervalRef.current = null;
                    }
                  }
                } catch {}
              }, 500);
            }
          }
        },
      },
    });
  }

  // Cleanup on close
  useEffect(() => {
    if (!open) {
      cleanupPlayer();
    }
  }, [open]);

  if (!open || !videoUrl) return null;

  function parseYouTubeUrl(url: string): { videoId: string | null; start: number | null; end: number | null } {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]+)/);
    if (!match) return { videoId: null, start: null, end: null };

    const videoId = match[1];
    const params = new URLSearchParams(url.includes("?") ? url.slice(url.indexOf("?") + 1) : "");
    const startRaw = params.get("start") || params.get("t");
    const endRaw = params.get("end");

    function toSeconds(value: string | null): number | null {
      if (!value) return null;
      if (/^\d+$/.test(value)) return Number(value);
      const m = value.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
      if (m && (m[1] || m[2] || m[3])) {
        return Number(m[1] || 0) * 3600 + Number(m[2] || 0) * 60 + Number(m[3] || 0);
      }
      return null;
    }

    return {
      videoId,
      start: toSeconds(startRaw),
      end: toSeconds(endRaw),
    };
  }

  function isYouTube(url: string): boolean {
    return url.includes("youtube.com") || url.includes("youtu.be");
  }

  function handleClose() {
    setIsLandscape(false);
    cleanupPlayer();
    onClose();
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
      {/* Header */}
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
      <div className="flex-1 flex items-center justify-center bg-black overflow-hidden px-1">
        <div className={`w-full ${isLandscape ? "h-full" : "max-h-full"}`} style={!isLandscape ? { aspectRatio: "16/9" } : undefined}>
          {isYouTube(videoUrl) ? (
            <div ref={containerRef} className="w-full h-full" />
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
