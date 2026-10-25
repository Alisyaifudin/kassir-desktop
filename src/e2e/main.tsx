import { Layer } from "effect";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router";
import "~/global.css";
import { LocalStorageLive } from "~/services/local-storage/live";
import { buildAppLive, makeService, type AppService } from "~/services/wiring";
import { createBrowserDatabase, databaseLayer } from "./sqljs";
import { StoreBrowserLive } from "./store-browser";
import { installTauriShim } from "./tauri-shim";

/**
 * End-to-end entry point.
 *
 * Boots the real app against an in-browser backend instead of the Tauri
 * plugins: sql.js runs the real migration files, `localStorage` stands in for
 * `plugin-store` / `plugin-fs`, and both are seeded from `page.addInitScript`
 * before anything renders.
 *
 * Order matters. `~/services` resolves the injected instance when it is first
 * imported, so the global has to be set while the router is still a dynamic
 * import — importing `~/route` statically would capture the real service.
 */
declare global {
  interface Window {
    __KASSIR_SERVICE__?: AppService;
    __E2E_SEED_SQL__?: string[];
    __E2E_SEED_STORAGE__?: Record<string, unknown>;
  }
}

function seedStorage(entries: Record<string, unknown>) {
  for (const [key, value] of Object.entries(entries)) {
    localStorage.setItem(key, JSON.stringify(value));
  }
}

async function boot() {
  installTauriShim();

  const db = await createBrowserDatabase(window.__E2E_SEED_SQL__ ?? []);
  seedStorage(window.__E2E_SEED_STORAGE__ ?? {});

  const hidden = Layer.mergeAll(databaseLayer(db), LocalStorageLive, StoreBrowserLive);
  window.__KASSIR_SERVICE__ = makeService(buildAppLive(hidden));

  const { router } = await import("~/route");
  ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <RouterProvider router={router} />,
  );
}

boot().catch((error: unknown) => {
  // A rejected boot would otherwise leave a blank page with no clue why. Render
  // the failure so a Playwright timeout shows the real cause.
  console.error("[e2e] boot failed", error);
  const root = document.getElementById("root");
  if (root) {
    root.textContent = `[e2e] boot failed: ${error instanceof Error ? error.stack : String(error)}`;
  }
  throw error;
});
