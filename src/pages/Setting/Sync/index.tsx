import type { RouteObject } from "react-router";
import { AdminOnly } from "~/components/AdminOnly";
import Page from "./page";

/**
 * Admin-only, like Data and Printer: the token is the shop's whole sync
 * credential, and a cashier has no reason to read or change it.
 *
 * Eager, like the other settings screens — the copy is static and the stored
 * configuration loads through `useQuery` inside the panel.
 */
export const syncRoute: RouteObject = {
  Component: () => (
    <AdminOnly>
      <Page />
    </AdminOnly>
  ),
  path: "sync",
};
