import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import DesktopSidebar from "./DesktopSidebar";
import DesktopTopbar from "./DesktopTopbar";
import LegalModal from "../../components/LegalModal";
import AuthorModal from "../../components/AuthorModal";

/**
 * Desktop qobiq (shell): chapda sidebar, tepada topbar, markazda kontent.
 *
 * Sahifa yo'li o'zgarganda kontent yumshoq fade+slide animatsiya bilan almashadi.
 * Sidebar/topbar qayta render bo'lmaydi — shuning uchun o'tishlar tez ko'rinadi.
 */
export default function DesktopLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [legal, setLegal] = useState<{ open: boolean; type: "terms" | "privacy" }>({
    open: false,
    type: "terms",
  });
  const [authorOpen, setAuthorOpen] = useState(false);

  // Sahifa almashganda tepaga qaytish
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [location.pathname]);

  // Test ishlash ekrani — chalg'itmaslik uchun sidebar/topbar yashiriladi
  const isFocusMode =
    location.pathname.startsWith("/test/") ||
    location.pathname.startsWith("/login") ||
    location.pathname.startsWith("/register") ||
    location.pathname.startsWith("/payment") ||
    location.pathname.startsWith("/premium-gate");

  if (isFocusMode) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: "var(--theme-bg)" }}>
        <div key={location.pathname} className="dk-anim-fade-in">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "var(--theme-bg)" }}>
      <DesktopSidebar onLegalOpen={(type) => setLegal({ open: true, type })} onAuthorOpen={() => setAuthorOpen(true)} />

      <div
        className="flex-1 flex flex-col"
        style={{
          marginLeft: "var(--dk-sidebar-current, var(--dk-sidebar-w))",
          transition: "margin-left 0.36s var(--dk-ease)",
        }}
      >
        <DesktopTopbar />

        <main className="flex-1 px-8 py-8">
          <div className="mx-auto w-full" style={{ maxWidth: "var(--dk-content-max)" }}>
            {/* key — sahifa o'zgarganda kirish animatsiyasini qayta ishga tushiradi */}
            <div key={location.pathname} className="dk-anim-fade-up">
              {children}
            </div>
          </div>
        </main>

        <DesktopFooter />
      </div>

      <LegalModal open={legal.open} type={legal.type} onClose={() => setLegal({ ...legal, open: false })} />
      <AuthorModal open={authorOpen} onClose={() => setAuthorOpen(false)} />
    </div>
  );
}

function DesktopFooter() {
  return (
    <footer
      className="px-8 py-6 mt-4 dk-no-print"
      style={{ borderTop: "1px solid var(--dk-border)" }}
    >
      <div
        className="mx-auto w-full flex flex-wrap items-center gap-x-6 gap-y-2 justify-between"
        style={{ maxWidth: "var(--dk-content-max)" }}
      >
        <p className="text-[12px] text-gray-400">
          © {new Date().getFullYear()} Wisdom — ingliz tili ta'lim platformasi.
        </p>
        <p className="text-[11px] text-gray-400">
          So'nggi yangilanish:{" "}
          {new Date(__BUILD_DATE__).toLocaleString("uz-UZ", {
            day: "numeric",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
    </footer>
  );
}
