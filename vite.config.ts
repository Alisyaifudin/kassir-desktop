import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { vanillaExtractPlugin } from "@vanilla-extract/vite-plugin";
// process is a nodejs/bun global
const host = process.env.TAURI_DEV_HOST;

// react({
//   babel: {
//     plugins: ["babel-plugin-react-compiler"],
//   },
// }),
// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  const isDev = command === "serve" || mode === "development";
  return {
    plugins: [
      vanillaExtractPlugin(),
      react(),
      tailwindcss(),
      // Only scan the app's own tsconfig files. Without this, the plugin also
      // scans `docs/tsconfig.json` (a separate Docusaurus project) and warns
      // because `@docusaurus/tsconfig` is not installed in the root.
      tsconfigPaths({
        projects: ["./tsconfig.json", "./tsconfig.node.json"],
      }),
      {
        name: "inject-react-scan",
        // Dev-only React Scan, served from `node_modules` rather than a CDN: the
        // floating `//unpkg.com` tag resolved to plain HTTP in dev (an extra
        // redirect before the real script) and to `tauri://unpkg.com` in a
        // build, and it silently floated to whatever react-scan shipped last.
        // Loaded as a module script ahead of `/src/main.tsx` so the DevTools
        // hook is patched before react-dom announces its renderer.
        //
        // The Playwright harness runs without the overlay: react-scan's root sits
        // over the bottom-right of the page and intercepts clicks, and its FPS
        // bar lands in every screenshot taken from `/e2e.html`.
        transformIndexHtml(html, ctx) {
          if (isDev && !ctx.filename.endsWith("e2e.html")) {
            return html.replace(
              "</head>",
              '<script type="module" src="/src/dev/react-scan.ts"></script></head>',
            );
          }
          return html;
        },
      },
    ],
    base: "./",
    build: {
      chunkSizeWarningLimit: 2000,
    },
    // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
    //
    // 1. prevent vite from obscuring rust errors
    clearScreen: false,
    // 2. tauri expects a fixed port, fail if that port is not available
    server: {
      port: 1420,
      strictPort: true,
      host: host || false,
      hmr: host
        ? {
            protocol: "ws",
            host,
            port: 1421,
          }
        : undefined,
      watch: {
        // 3. tell vite to ignore watching `src-tauri`
        ignored: ["**/src-tauri/**"],
      },
    },
  };
});
