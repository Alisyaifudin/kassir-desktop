import { RouteObject } from "react-router";
import { AdminOnly } from "~/components/AdminOnly";
import Page from "./page.tsx";

export const newExtraRoute: RouteObject = {
  Component: () => (
    <AdminOnly fallback="/extras">
      <Page />
    </AdminOnly>
  ),
  path: "new",
};
