import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  define: {
    // Build (deploy) vaqti — footer'da "yangilangan sana" sifatida ko'rsatiladi
    __BUILD_DATE__: JSON.stringify(new Date().toISOString()),
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@shared": path.resolve(__dirname, "../shared/src"),
    },
    dedupe: ["react", "react-dom"],
  },
  envDir: path.resolve(__dirname, ".."),
  build: {
    // Kutubxonalarni alohida chunk'larga ajratamiz — brauzer ularni keshda
    // saqlaydi va ilova kodi o'zgarganda qayta yuklab olmaydi.
    // Bu desktop versiyaning tez ochilishiga sezilarli yordam beradi.
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-katex": ["katex"],
          "vendor-icons": ["lucide-react"],
        },
      },
    },
    chunkSizeWarningLimit: 900,
  },
  server: {
    port: 3001,
    hmr: {
      protocol: "ws",
      host: "localhost",
      port: 3001,
    },
  },
});
