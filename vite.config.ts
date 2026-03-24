import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

function suppressKnownPostcssFromWarning() {
  const warningText = "A PostCSS plugin did not pass the `from` option to `postcss.parse`";

  return {
    name: "suppress-known-postcss-from-warning",
    apply: "build",
    configResolved() {
      const originalWarn = console.warn.bind(console);
      console.warn = (...args: unknown[]) => {
        const first = args[0];
        if (typeof first === "string" && first.includes(warningText)) {
          return;
        }
        originalWarn(...args);
      };
    },
  } as const;
}

export default defineConfig({
  envDir: import.meta.dirname,
  plugins: [
    suppressKnownPostcssFromWarning(),
    react(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  base:process.env.VITE_BASE_PATH || "/olive-startup-house-crm",
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "client", "src", "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist"),
    emptyOutDir: true,
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
