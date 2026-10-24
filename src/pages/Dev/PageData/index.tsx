import type { RouteObject } from "react-router";
import Page from "./page.tsx";

/**
 * Dev-only playground for the page-data pattern. Mounted from `route.tsx` behind
 * `import.meta.env.DEV`, so a release build drops the module — and with it this
 * import — entirely, rather than carrying an unreachable chunk for a route that
 * does not exist.
 */
export const devPageDataRoute: RouteObject = {
  path: "dev/page-data",
  Component: Page,
};
