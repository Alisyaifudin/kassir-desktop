import { RouteObject } from "react-router";
import { AdminOnly } from "~/components/AdminOnly";
import Page from "./page";

export const reportRoute: RouteObject = {
  Component: () => (
    // The report exposes margins and rewrites how every past period reads, so it
    // is the owner's screen — as `/customers` and `/categories` are. A cashier
    // keeps `/records`.
    <AdminOnly fallback="/records">
      <Page />
    </AdminOnly>
  ),
  path: "report",
};
