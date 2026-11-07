import type { RouteObject } from "react-router";
import { AdminOnly } from "~/components/AdminOnly";
import Page from "./page";

export const comboRoute: RouteObject = {
  path: "combos",
  Component: () => (
    <AdminOnly fallback="/products">
      <Page />
    </AdminOnly>
  ),
};
