import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@shared": path.resolve(__dirname, "../shared/src"),
    },
    dedupe: ["react", "react-dom"],
  },
  envDir: path.resolve(__dirname, ".."),
  server: {
    port: 3001,
    hmr: {
      protocol: "ws",
      host: "localhost",
      port: 3001,
    },
  },
});
