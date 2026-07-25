import { useState, useEffect } from "react";

export function useDarkMode() {
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem("edukids-dark-mode") === "true";
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add("dark");
      // Dark mode CSS variablelarni set qilish
      root.style.setProperty("--theme-bg", "#0f172a");
      root.style.setProperty("--theme-card-bg", "#1e293b");
      root.style.setProperty("--theme-text", "#f1f5f9");
      root.style.setProperty("--theme-text-secondary", "#94a3b8");
      root.style.setProperty("--theme-nav-bg", "#1e293b");
    } else {
      root.classList.remove("dark");
      // Light mode — default yoki admin sozlamalarini qaytarish
      root.style.setProperty("--theme-bg", "#f9fafb");
      root.style.setProperty("--theme-card-bg", "#ffffff");
      root.style.setProperty("--theme-text", "#111827");
      root.style.setProperty("--theme-text-secondary", "#6b7280");
      root.style.setProperty("--theme-nav-bg", "#ffffff");
    }
    localStorage.setItem("edukids-dark-mode", String(isDark));
  }, [isDark]);

  function toggle() {
    setIsDark((prev) => !prev);
  }

  return { isDark, toggle };
}
