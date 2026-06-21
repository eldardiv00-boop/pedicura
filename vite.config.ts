import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

declare const process: { env: Record<string, string | undefined> };

// https://vitejs.dev/config/
export default defineConfig({
  // On GitHub Pages the site is served from /pedicura/; locally it stays at /.
  base: process.env.GITHUB_ACTIONS ? "/pedicura/" : "/",
  plugins: [react()],
  server: {
    host: true,
    port: 8080,
  },
});
