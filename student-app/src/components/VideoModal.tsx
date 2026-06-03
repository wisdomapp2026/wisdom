import { X } from "lucide-react";

interface Props {
  open: boolean;
  videoUrl: string;
  onClose: () => void;
}

/**
 * Video Player Modal — YouTube yoki upload video ko'rsatish
 */
export default function VideoModal({ open, videoUrl, onClose }: Props) {
  if (!open || !videoUrl) return null;

  // YouTube URL ni embed formatga o'girish
  function getEmbedUrl(url: string): string {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
    if (match) return `https://www.youtube.com/embed/${match[1]}?autoplay=1`;
    return url;
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex flex-col">
      {/* Close button */}
      <div className="flex justify-end p-4">
        <button onClick={onClose} className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors">
          <X size={22} className="text-white" />
        </button>
      </div>

      {/* Video player */}
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-lg aspect-video rounded-xl overflow-hidden bg-black">
          <iframe
            src={getEmbedUrl(videoUrl)}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </div>
    </div>
  );
}
