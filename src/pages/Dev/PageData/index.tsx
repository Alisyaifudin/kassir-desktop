import { lazy, Suspense } from "react";
import type { RouteObject } from "react-router";

const Page = lazy(() => import("./page.tsx"));

/**
 * Dev-only playground for the page-data pattern. Mounted from `route.tsx` behind
 * `import.meta.env.DEV`: the route never exists in a release, but the page is a
 * lazily-imported chunk, so a production bundle still carries that one (small,
 * unreachable) chunk. Splitting the route object into a DEV-only module is not
 * worth a top-level `await` in the router.
 */
export const devPageDataRoute: RouteObject = {
  path: "dev/page-data",
  Component: () => (
    <Suspense fallback={null}>
      <Page />
    </Suspense>
  ),
};
