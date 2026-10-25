import { RouteObject } from "react-router";
import { AdminOnly } from "~/components/AdminOnly";
import Page from "./page";

export const cashierRoute: RouteObject = {
  Component: () => (
    <AdminOnly fallback="/setting">
      <Page />
    </AdminOnly>
  ),
  path: "cashier",
};
