import type { RouteObject } from "react-router";
import Page from "./page";

/**
 * Eager on purpose: the page's head, panel titles and field labels are static
 * (`util-nav.ts` and the form markup), and its values load through `page-data`
 * inside the screen. A lazy screen under `Suspense` only hid that static half
 * behind a page-shaped skeleton, so the route imports it directly.
 */
export const profileRoute: RouteObject = {
  Component: Page,
  path: "profile",
};
