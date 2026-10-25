import { RouteObject } from "react-router";
import { AdminOnly } from "~/components/AdminOnly";
import Page from "./page";

export const customerRoute: RouteObject = {
  Component: () => (
    <AdminOnly fallback="/setting">
      <Page />
    </AdminOnly>
  ),
  path: "customer",
};
