import { RouteObject } from "react-router";
import { AdminOnly } from "~/components/AdminOnly";
import Page from "./page";

export const reportCategoriesRoute: RouteObject = {
  Component: () => (
    // Reached from the report screen, and behind the same gate: naming the money
    // is the owner's job, and a cashier has no report to open it from.
    <AdminOnly fallback="/records">
      <Page />
    </AdminOnly>
  ),
  path: "report/categories",
};
