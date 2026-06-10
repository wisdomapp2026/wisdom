import { NavLink, useLocation } from "react-router-dom";
import { Home, BookOpen, ClipboardList, User, PlayCircle } from "lucide-react";
import clsx from "clsx";

const navItems = [
  { path: "/", label: "Bosh sahifa", icon: Home },
  { path: "/continue", label: "Davom etish", icon: PlayCircle },
  { path: "/courses", label: "Kurslar", icon: BookOpen },
  { path: "/tests", label: "Testlar", icon: ClipboardList },
  { path: "/profile", label: "Profil", icon: User },
];

export default function BottomNav() {
  const location = useLocation();
  // Login, register, payment kabi sahifalarda nav ko'rsatmaslik
  const hideOn = ["/login", "/register", "/payment", "/premium-gate", "/subscription"];
  if (hideOn.some((p) => location.pathname.startsWith(p))) return null;
  // Test ishlash paytida ham yashirish
  if (location.pathname.startsWith("/test/")) return null;

  return (
    <nav className="bottom-nav">
      {navItems.map(({ path, label, icon: Icon }) => {
        const isActive = path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);
        return (
          <NavLink key={path} to={path} className={clsx("nav-item", isActive && "active")}>
            <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
            <span>{label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
