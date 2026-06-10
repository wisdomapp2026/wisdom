import { useState, useEffect } from "react";

export function useDarkMode() {
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem("edukids-dark-mode") === "true";
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("edukids-dark-mode", String(isDark));
  }, [isDark]);

  function toggle() {
    setIsDark((prev) => !prev);
  }

  return { isDark, toggle };
}
