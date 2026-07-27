import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, Play, X } from "lucide-react";
import { getActiveNewsItems } from "@shared/repositories";
import type { NewsItem } from "@shared/types";

function getYouTubeThumbnail(url: string): string {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
  return match ? `https://img.youtube.com/vi/${match[1]}/mqdefault.jpg` : "";
}

function getEmbedUrl(url: string): string {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
  return match ? `https://www.youtube-nocookie.com/embed/${match[1]}?autoplay=1&controls=0&modestbranding=1&rel=0&showinfo=0&iv_load_policy=3&disablekb=1` : url;
}

export default function AllNews() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<NewsItem | null>(null);

  useEffect(() => {
    getActiveNewsItems().then((data) => { setItems(data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  function handleClick(item: NewsItem) {
    if (item.type === "image" && item.linkUrl) {
      window.open(item.linkUrl, "_blank");
    } else {
      setSelectedItem(item);
    }
  }

  return (
    <div className="page-content pb-24 bg-gray-50 min-h-screen">
      <header className="bg-white px-5 pt-4 pb-4 border-b border-gray-100 flex items-center gap-3">
        <Link to="/" className="text-gray-500"><ChevronLeft size={22} /></Link>
        <h1 className="text-lg font-bold text-gray-900">Yangiliklar</h1>
      </header>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 border-3 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && items.length === 0 && (
        <div className="text-center py-20 px-5">
          <p className="text-4xl mb-3">📰</p>
          <p className="text-sm text-gray-500">Hali yangilik yo'q</p>
        </div>
      )}

      {!loading && items.length > 0 && (
        <div className="px-5 mt-4 space-y-4">
          {items.map((item) => {
            const thumb = item.imageUrl || (item.type === "video" && item.videoUrl ? getYouTubeThumbnail(item.videoUrl) : "");
            const date = new Date(item.createdAt);
            return (
              <button
                key={item.id}
                onClick={() => handleClick(item)}
                className="w-full bg-white border border-gray-100 rounded-2xl overflow-hidden text-left active:bg-gray-50 shadow-sm"
              >
                {/* Rasm / Video thumbnail */}
                {thumb && (
                  <div className="w-full h-44 relative overflow-hidden">
                    <img src={thumb} alt="" className="w-full h-full object-cover" />
                    {item.type === "video" && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center">
                          <Play size={20} className="text-gray-800 ml-0.5" fill="currentColor" />
                        </div>
                      </div>
                    )}
                    {item.duration && (
                      <span className="absolute bottom-2 right-2 text-xs text-white bg-black/70 px-2 py-0.5 rounded-md font-medium">{item.duration}</span>
                    )}
                  </div>
                )}
                {/* Matn */}
                <div className="p-4">
                  <h3 className="text-sm font-bold text-gray-900">{item.title}</h3>
                  {item.body && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{item.body}</p>}
                  <p className="text-[10px] text-gray-400 mt-2">
                    {date.toLocaleDateString("uz-UZ", { year: "numeric", month: "long", day: "numeric" })} · {date.toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Detail modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setSelectedItem(null)}>
          <div className="bg-white w-full max-w-md max-h-[85vh] rounded-2xl overflow-hidden flex flex-col shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 shrink-0">
              <h2 className="font-bold text-gray-900 truncate">{selectedItem.title}</h2>
              <button onClick={() => setSelectedItem(null)} className="p-2 text-gray-400 hover:text-gray-600 text-lg">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {selectedItem.imageUrl && (
                <img src={selectedItem.imageUrl} alt={selectedItem.title} className="w-full max-h-56 object-cover" />
              )}
              {selectedItem.type === "video" && selectedItem.videoUrl && (
                <div className="aspect-video bg-black">
                  {selectedItem.videoUrl.includes("youtube") || selectedItem.videoUrl.includes("youtu.be") ? (
                    <iframe src={getEmbedUrl(selectedItem.videoUrl)} className="w-full h-full" allow="accelerometer; autoplay; encrypted-media" allowFullScreen />
                  ) : (
                    <video src={selectedItem.videoUrl} controls autoPlay className="w-full h-full" />
                  )}
                </div>
              )}
              {selectedItem.body && (
                <div className="px-5 py-4">
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{selectedItem.body}</p>
                </div>
              )}
              <div className="px-5 py-3 border-t border-gray-100">
                <p className="text-[10px] text-gray-400">
                  {new Date(selectedItem.createdAt).toLocaleDateString("uz-UZ", { year: "numeric", month: "long", day: "numeric" })}
                  {selectedItem.duration && ` · ⏱ ${selectedItem.duration}`}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
