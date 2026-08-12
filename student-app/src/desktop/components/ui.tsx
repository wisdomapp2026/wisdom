import { useEffect, useRef, useState } from "react";
import type { ReactNode, CSSProperties } from "react";
import { Link } from "react-router-dom";

/* ============================================================
   Desktop UI primitivlari — kichik, qayta ishlatiladigan bloklar.
   Mobil komponentlarga tegmaydi.
   ============================================================ */

/** Bo'lim sarlavhasi: chap tomonda rangli chiziq + matn, o'ngda "Barchasi" havolasi */
export function SectionHeading({
  title,
  subtitle,
  icon,
  action,
}: {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-4 mb-5">
      <div className="flex items-center gap-3 min-w-0">
        {icon ? (
          <span className="w-10 h-10 rounded-2xl grid place-items-center shrink-0 bg-primary-50 text-primary-600">
            {icon}
          </span>
        ) : (
          <span className="w-1.5 h-8 rounded-full bg-primary-500 shrink-0" />
        )}
        <div className="min-w-0">
          <h2 className="text-[22px] font-extrabold tracking-tight text-gray-900 leading-tight">{title}</h2>
          {subtitle && <p className="text-[13px] text-gray-500 mt-0.5 dk-clamp-1">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/** "Barchasini ko'rish" tipidagi havola */
export function GhostLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="group inline-flex items-center gap-1.5 text-[13px] font-semibold text-primary-600 bg-primary-50 hover:bg-primary-100 px-4 py-2 rounded-full transition-colors"
    >
      {children}
      <span className="transition-transform duration-300 group-hover:translate-x-0.5">→</span>
    </Link>
  );
}

/** Statistika kartochkasi */
export function StatCard({
  icon,
  label,
  value,
  tone = "primary",
  delta,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  tone?: "primary" | "green" | "amber" | "purple";
  delta?: string;
}) {
  const tones: Record<string, string> = {
    primary: "from-primary-500/12 to-primary-500/0 text-primary-600",
    green: "from-emerald-500/12 to-emerald-500/0 text-emerald-600",
    amber: "from-amber-500/12 to-amber-500/0 text-amber-600",
    purple: "from-violet-500/12 to-violet-500/0 text-violet-600",
  };
  return (
    <div className="dk-card dk-card-hover p-5 relative overflow-hidden">
      <div className={`absolute inset-0 bg-gradient-to-br ${tones[tone]} pointer-events-none`} />
      <div className="relative">
        <div className={`w-11 h-11 rounded-2xl grid place-items-center bg-white/70 dark:bg-white/5 ${tones[tone].split(" ").pop()}`}>
          {icon}
        </div>
        <p className="text-[28px] font-extrabold text-gray-900 mt-3.5 leading-none tabular-nums">{value}</p>
        <div className="flex items-center gap-2 mt-1.5">
          <p className="text-[12px] font-medium text-gray-500">{label}</p>
          {delta && (
            <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md">
              {delta}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/** Progress bar — ko'rinishga kelganda animatsiya bilan to'ladi */
export function ProgressBar({
  value,
  height = 8,
  gradient = true,
}: {
  value: number;
  height?: number;
  gradient?: boolean;
}) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  const [shown, setShown] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          // Kichik kechikish — kirish animatsiyasi bilan bir vaqtda ketmasligi uchun
          requestAnimationFrame(() => setShown(pct));
          io.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [pct]);

  return (
    <div
      ref={ref}
      className="w-full rounded-full overflow-hidden bg-gray-100"
      style={{ height }}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={`h-full rounded-full ${
          gradient ? "bg-gradient-to-r from-primary-400 to-primary-600" : "bg-primary-500"
        }`}
        style={{ width: `${shown}%`, transition: "width 0.9s cubic-bezier(0.22,1,0.36,1)" }}
      />
    </div>
  );
}

/** Aylana shaklidagi progress (foizni markazda ko'rsatadi) */
export function RingProgress({
  value,
  size = 96,
  stroke = 8,
  color = "var(--theme-primary)",
  track = "rgba(148,163,184,0.22)",
  label,
}: {
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
  track?: string;
  label?: string;
}) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const [shown, setShown] = useState(0);

  useEffect(() => {
    const t = requestAnimationFrame(() => setShown(pct));
    return () => cancelAnimationFrame(t);
  }, [pct]);

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - shown / 100)}
          style={{ transition: "stroke-dashoffset 1.05s cubic-bezier(0.22,1,0.36,1)" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-content-center text-center">
        <span className="text-xl font-extrabold text-gray-900 leading-none tabular-nums">{pct}%</span>
        {label && <span className="text-[10px] text-gray-400 mt-0.5">{label}</span>}
      </div>
    </div>
  );
}

/** Yorliq / chip */
export function Chip({
  children,
  tone = "gray",
  className = "",
  style,
}: {
  children: ReactNode;
  tone?: "gray" | "primary" | "green" | "amber" | "red" | "glass";
  className?: string;
  style?: CSSProperties;
}) {
  const tones: Record<string, string> = {
    gray: "bg-gray-50 text-gray-600",
    primary: "bg-primary-50 text-primary-600",
    green: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-700",
    red: "bg-red-50 text-red-600",
    glass: "bg-white/90 text-gray-700 backdrop-blur-sm",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[11.5px] font-semibold px-2.5 py-1.5 rounded-xl ${tones[tone]} ${className}`}
      style={style}
    >
      {children}
    </span>
  );
}

/** Premium nishoni */
export function PremiumBadge() {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-white px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 shadow-lg shadow-amber-500/25">
      👑 Premium
    </span>
  );
}

/** Bo'sh holat bloki */
export function EmptyState({
  emoji = "📚",
  title,
  hint,
  action,
}: {
  emoji?: string;
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="dk-surface py-16 px-8 text-center dk-anim-fade-in">
      <div className="w-20 h-20 mx-auto rounded-3xl bg-gray-50 grid place-items-center text-4xl dk-anim-float">
        {emoji}
      </div>
      <p className="text-base font-bold text-gray-700 mt-5">{title}</p>
      {hint && <p className="text-[13px] text-gray-400 mt-1.5 max-w-md mx-auto">{hint}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

/** Skeleton bloki */
export function Skeleton({ className = "", style }: { className?: string; style?: CSSProperties }) {
  return <div className={`dk-skeleton ${className}`} style={style} />;
}

/** Asosiy tugma */
export function PrimaryButton({
  children,
  onClick,
  className = "",
  type = "button",
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`dk-press inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-primary-500 hover:bg-primary-600 text-white text-sm font-bold shadow-lg shadow-primary-500/25 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {children}
    </button>
  );
}

/** Ikkilamchi (outline) tugma */
export function SecondaryButton({
  children,
  onClick,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`dk-press inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 transition-colors ${className}`}
      style={{ border: "1px solid var(--dk-border)" }}
    >
      {children}
    </button>
  );
}

/** Elementni ko'rinishga kelganda animatsiya bilan chiqarish */
export function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.08, rootMargin: "0px 0px -40px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translate3d(0,0,0)" : "translate3d(0,22px,0)",
        transition: `opacity 0.6s var(--dk-ease) ${delay}ms, transform 0.6s var(--dk-ease) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

/** Gorizontal karusel — o'q tugmalari va sudrab surish bilan */
export function HScroller({
  children,
  itemWidth = 320,
  className = "",
  ariaLabel,
}: {
  children: ReactNode;
  itemWidth?: number;
  className?: string;
  ariaLabel?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  function sync() {
    const el = ref.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 8);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
  }

  useEffect(() => {
    sync();
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, [children]);

  function scrollBy(dir: 1 | -1) {
    const el = ref.current;
    if (!el) return;
    const step = Math.max(itemWidth + 20, Math.round(el.clientWidth * 0.8));
    el.scrollBy({ left: dir * step, behavior: "smooth" });
  }

  // Sichqoncha bilan sudrab surish
  const drag = useRef({ active: false, startX: 0, startScroll: 0, moved: false });

  return (
    <div className={`relative group/scroller ${className}`}>
      <div
        ref={ref}
        onScroll={sync}
        aria-label={ariaLabel}
        className="flex gap-5 overflow-x-auto scrollbar-hide pb-2 select-none"
        style={{ scrollSnapType: "x proximity", cursor: "grab" }}
        onMouseDown={(e) => {
          const el = ref.current;
          if (!el) return;
          drag.current = { active: true, startX: e.pageX, startScroll: el.scrollLeft, moved: false };
          el.style.cursor = "grabbing";
          el.style.scrollSnapType = "none";
        }}
        onMouseMove={(e) => {
          const el = ref.current;
          if (!el || !drag.current.active) return;
          const dx = e.pageX - drag.current.startX;
          if (Math.abs(dx) > 4) drag.current.moved = true;
          el.scrollLeft = drag.current.startScroll - dx;
        }}
        onMouseUp={() => {
          const el = ref.current;
          drag.current.active = false;
          if (el) {
            el.style.cursor = "grab";
            el.style.scrollSnapType = "x proximity";
          }
        }}
        onMouseLeave={() => {
          const el = ref.current;
          drag.current.active = false;
          if (el) {
            el.style.cursor = "grab";
            el.style.scrollSnapType = "x proximity";
          }
        }}
        // Sudrab surgandan keyin bosish hodisasini bloklash (link ochilib ketmasligi uchun)
        onClickCapture={(e) => {
          if (drag.current.moved) {
            e.preventDefault();
            e.stopPropagation();
            drag.current.moved = false;
          }
        }}
      >
        {children}
      </div>

      {canLeft && (
        <ScrollArrow dir="left" onClick={() => scrollBy(-1)} />
      )}
      {canRight && (
        <ScrollArrow dir="right" onClick={() => scrollBy(1)} />
      )}
    </div>
  );
}

function ScrollArrow({ dir, onClick }: { dir: "left" | "right"; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label={dir === "left" ? "Orqaga surish" : "Oldinga surish"}
      className={`absolute top-1/2 -translate-y-1/2 ${
        dir === "left" ? "left-0 -translate-x-1/2" : "right-0 translate-x-1/2"
      } w-11 h-11 rounded-full grid place-items-center bg-white text-gray-700 shadow-xl z-20
      opacity-0 group-hover/scroller:opacity-100 transition-all duration-300 hover:scale-110 dk-press`}
      style={{ border: "1px solid var(--dk-border)" }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        {dir === "left" ? <path d="M15 18l-6-6 6-6" /> : <path d="M9 18l6-6-6-6" />}
      </svg>
    </button>
  );
}
