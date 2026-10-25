import type { RouteObject } from "react-router";
import Page from "./page.tsx";

/**
 * Dev-only playground for the page-data cache. Mounted from `route.tsx` behind
 * `import.meta.env.DEV`, like `Dev/PageData`, so a release build drops the module
 * and its unreachable chunk entirely.
 */
export const devPageCacheRoute: RouteObject = {
  path: "dev/page-cache",
  Component: Page,
};
