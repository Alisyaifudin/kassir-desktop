import type { RouteObject } from "react-router";
import { AdminOnly } from "~/components/AdminOnly";
import Page from "./page";

/**
 * Eager on purpose, like the rest of the section: the head, the panel titles and
 * every label are static, and only the numbers load. A lazy screen behind
 * `Suspense` would hide that static half behind a page-shaped skeleton.
 *
 * Admins only: the job rewrites the files every product's gallery draws from, and
 * it is the shop's storage — not a cashier's screen.
 */
export const imageRoute: RouteObject = {
  Component: () => (
    <AdminOnly>
      <Page />
    </AdminOnly>
  ),
  path: "image",
};
