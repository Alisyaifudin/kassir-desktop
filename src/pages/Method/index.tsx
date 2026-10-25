import { RouteObject } from "react-router";
import { AdminOnly } from "~/components/AdminOnly";
import Page from "./page";

export const methodRoute: RouteObject = {
  Component: () => (
    <AdminOnly fallback="/setting">
      <Page />
    </AdminOnly>
  ),
  path: "method",
};
