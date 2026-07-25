import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Search } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { getUserById } from "@shared/repositories";
import { useEffect } from "react";
import HamburgerMenu from "./HamburgerMenu";
import NotificationBell from "./NotificationBell";
import AuthorModal from "./AuthorModal";

export default function TopHeader() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [authorModalOpen, setAuthorModalOpen] = useState(false);
  const [userData, setUserData] = useState<{ name?: string; avatar?: string } | null>(null);

  useEffect(() => {
    if (user) {
      getUserById(user.uid).then((u) => {
        if (u) setUserData({ name: u.name, avatar: u.avatar });
      }).catch(() => {});
    }
  }, [user]);

  // Bu sahifalarda header ko'rsatmaslik
  const hideOn = ["/login", "/register", "/payment", "/premium-gate", "/subscription"];
  if (hideOn.some((p) => location.pathname.startsWith(p))) return null;
  if (location.pathname.startsWith("/test/")) return null;

  return (
    <>
      <header className="flex items-center justify-between px-5 pt-4 pb-2" style={{ backgroundColor: 'var(--theme-bg)' }}>
        <div className="flex items-center gap-2">
          <HamburgerMenu />
          <button onClick={() => setAuthorModalOpen(true)} className="flex items-center gap-2 active:opacity-70 transition-opacity">
            <div className="w-9 h-9 bg-primary-500 rounded-xl flex items-center justify-center">
              <span className="text-white text-lg">⚡</span>
            </div>
            <span className="text-lg font-bold text-primary-500">EduKids</span>
          </button>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => navigate("/courses")} className="w-10 h-10 flex items-center justify-center text-gray-500 rounded-xl active:bg-gray-100 transition-colors" aria-label="Qidirish">
            <Search size={20} />
          </button>
          <NotificationBell />
          <button onClick={() => navigate(user ? "/profile" : "/login")} className="w-9 h-9 rounded-full overflow-hidden border-2 border-gray-200">
            {userData?.avatar ? (
              <img src={userData.avatar} alt="" className="w-full h-full object-cover" />
            ) : user ? (
              <div className="w-full h-full flex items-center justify-center bg-primary-100 text-primary-600 text-sm font-bold">
                {(userData?.name || user.email || "U").charAt(0).toUpperCase()}
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-400 text-sm font-bold">?</div>
            )}
          </button>
        </div>
      </header>

      {/* Author Modal */}
      <AuthorModal open={authorModalOpen} onClose={() => setAuthorModalOpen(false)} />
    </>
  );
}
