import { RouteObject } from "react-router";
import { AdminOnly } from "~/components/AdminOnly";
import Page from "./page";

export const socialRoute: RouteObject = {
  Component: () => (
    <AdminOnly fallback="/setting">
      <Page />
    </AdminOnly>
  ),
  path: "social",
};
