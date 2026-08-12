import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import type { HomeBanner } from "@shared/types";
import { resolveBannerImage } from "../utils/responsiveImage";

const AUTOPLAY_MS = 6500;

/**
 * Desktop banner karuseli.
 *
 * Mobil versiyadan farqi:
 *  - Banner ancha katta (balandligi 22rem–30rem, ekranga moslashadi)
 *  - Desktop uchun alohida yuklangan rasm ishlatiladi (bo'lmasa mobil rasmga qaytadi)
 *  - Avtomatik aylanish, o'q tugmalari, klaviatura va progress indikatorlari
 */
export default function BannerCarousel({ banners }: { banners: HomeBanner[] }) {
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const count = banners.length;

  const goTo = useCallback(
    (next: number) => {
      if (count === 0) return;
      setIndex(((next % count) + count) % count);
    },
    [count]
  );

  // Avtomatik aylanish — hover yoki qo'lda to'xtatilganda pauza
  useEffect(() => {
    if (count <= 1 || paused || hovered) return;
    const t = setTimeout(() => goTo(index + 1), AUTOPLAY_MS);
    return () => clearTimeout(t);
  }, [index, paused, hovered, count, goTo]);

  // Sahifa fonga o'tganda taymerni behuda ishlatmaslik
  useEffect(() => {
    function onVisibility() {
      setPaused(document.hidden);
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  // Klaviatura navigatsiyasi (karusel fokusda bo'lganda)
  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      goTo(index - 1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      goTo(index + 1);
    }
  }

  function openBanner(banner: HomeBanner) {
    if (banner.courseId) navigate(`/course/${banner.courseId}`);
    else if (banner.linkUrl) window.open(banner.linkUrl, "_blank", "noopener,noreferrer");
  }

  if (count === 0) return null;

  return (
    <section
      ref={containerRef}
      className="relative group/banner outline-none"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onKeyDown={onKeyDown}
      tabIndex={0}
      aria-roledescription="karusel"
      aria-label="Bosh sahifa bannerlari"
    >
      {/* Slaydlar */}
      <div
        className="relative w-full overflow-hidden rounded-[28px] shadow-xl"
        style={{
          // Ekran balandligiga moslashadi, lekin juda cho'zilib ketmaydi
          height: "clamp(320px, 34vw, 460px)",
          border: "1px solid var(--dk-border)",
        }}
      >
        {banners.map((banner, i) => {
          const img = resolveBannerImage(banner);
          const active = i === index;
          return (
            <div
              key={banner.id}
              aria-hidden={!active}
              className="absolute inset-0 cursor-pointer"
              style={{
                backgroundColor: banner.bgColor,
                opacity: active ? 1 : 0,
                transform: active ? "scale(1)" : "scale(1.035)",
                transition: "opacity 0.7s var(--dk-ease), transform 0.9s var(--dk-ease)",
                pointerEvents: active ? "auto" : "none",
              }}
              onClick={() => openBanner(banner)}
            >
              {/* Rasm */}
              {img.url && (
                <img
                  src={img.url}
                  alt=""
                  loading={i === 0 ? "eager" : "lazy"}
                  decoding="async"
                  draggable={false}
                  className={
                    banner.imageFullWidth
                      ? "absolute inset-0 w-full h-full"
                      : "absolute right-0 top-0 h-full w-1/2"
                  }
                  style={{
                    objectFit: img.objectFit,
                    objectPosition: img.objectPosition,
                    opacity: img.opacity,
                  }}
                />
              )}

              {/* Matnni o'qishga yordam beruvchi gradient */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: banner.imageFullWidth
                    ? "linear-gradient(100deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.22) 46%, rgba(0,0,0,0) 72%)"
                    : "linear-gradient(100deg, rgba(0,0,0,0.14) 0%, rgba(0,0,0,0) 55%)",
                }}
              />

              {/* Kontent */}
              <div className="relative z-10 h-full flex flex-col justify-center px-12 lg:px-16 max-w-[62%]">
                <h2
                  className="font-extrabold tracking-tight leading-[1.08]"
                  style={{
                    color: banner.textColor || "#ffffff",
                    opacity: (banner.textOpacity ?? 100) / 100,
                    fontSize: "clamp(30px, 3.2vw, 52px)",
                    textShadow: "0 2px 24px rgba(0,0,0,0.22)",
                  }}
                >
                  {banner.title}
                </h2>
                {banner.subtitle && (
                  <p
                    className="mt-4 leading-relaxed dk-clamp-3"
                    style={{
                      color: banner.textColor || "#ffffff",
                      opacity: ((banner.textOpacity ?? 100) / 100) * 0.86,
                      fontSize: "clamp(15px, 1.15vw, 19px)",
                      textShadow: "0 1px 14px rgba(0,0,0,0.2)",
                    }}
                  >
                    {banner.subtitle}
                  </p>
                )}
                {banner.showButton !== false && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openBanner(banner);
                    }}
                    className="dk-press mt-8 self-start inline-flex items-center gap-2 bg-white/95 hover:bg-white text-gray-900 text-[15px] font-bold px-8 py-3.5 rounded-full shadow-2xl backdrop-blur-sm transition-all hover:gap-3.5"
                  >
                    {banner.buttonText}
                    <ChevronRight size={17} />
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {/* O'q tugmalari */}
        {count > 1 && (
          <>
            <CarouselArrow dir="left" onClick={() => goTo(index - 1)} />
            <CarouselArrow dir="right" onClick={() => goTo(index + 1)} />
          </>
        )}

        {/* Pauza / davom ettirish */}
        {count > 1 && (
          <button
            onClick={() => setPaused((p) => !p)}
            aria-label={paused ? "Aylanishni davom ettirish" : "Aylanishni to'xtatish"}
            className="absolute top-5 right-5 z-20 w-10 h-10 rounded-full grid place-items-center bg-black/25 hover:bg-black/40 text-white backdrop-blur-sm opacity-0 group-hover/banner:opacity-100 transition-all duration-300"
          >
            {paused ? <Play size={15} fill="currentColor" /> : <Pause size={15} fill="currentColor" />}
          </button>
        )}
      </div>

      {/* Indikatorlar */}
      {count > 1 && (
        <div className="flex items-center justify-center gap-2.5 mt-5">
          {banners.map((b, i) => (
            <button
              key={b.id}
              onClick={() => goTo(i)}
              aria-label={`${i + 1}-banner`}
              aria-current={i === index}
              className="relative h-2.5 rounded-full overflow-hidden transition-all duration-500"
              style={{
                width: i === index ? 46 : 10,
                backgroundColor: i === index ? "transparent" : "rgba(148,163,184,0.38)",
              }}
            >
              {i === index && (
                <>
                  <span className="absolute inset-0 rounded-full bg-primary-500/25" />
                  <span
                    key={`${index}-${paused}-${hovered}`}
                    className="absolute inset-y-0 left-0 rounded-full bg-primary-500"
                    style={{
                      animation:
                        paused || hovered
                          ? "none"
                          : `dkBannerFill ${AUTOPLAY_MS}ms linear forwards`,
                      width: paused || hovered ? "100%" : undefined,
                    }}
                  />
                </>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Indikator to'lish animatsiyasi */}
      <style>{`@keyframes dkBannerFill { from { width: 0% } to { width: 100% } }`}</style>
    </section>
  );
}

function CarouselArrow({ dir, onClick }: { dir: "left" | "right"; onClick: () => void }) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      aria-label={dir === "left" ? "Oldingi banner" : "Keyingi banner"}
      className={`absolute top-1/2 -translate-y-1/2 ${dir === "left" ? "left-5" : "right-5"}
        z-20 w-12 h-12 rounded-full grid place-items-center bg-white/92 hover:bg-white text-gray-800 shadow-2xl
        opacity-0 group-hover/banner:opacity-100 transition-all duration-300 hover:scale-110 dk-press`}
    >
      {dir === "left" ? <ChevronLeft size={22} /> : <ChevronRight size={22} />}
    </button>
  );
}
