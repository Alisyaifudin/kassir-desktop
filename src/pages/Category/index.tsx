import { RouteObject } from "react-router";
import { AdminOnly } from "~/components/AdminOnly";
import Page from "./page";

export const categoryRoute: RouteObject = {
  Component: () => (
    // Filing products under categories is catalogue management, like adding a
    // product — the till only reads the result.
    <AdminOnly fallback="/products">
      <Page />
    </AdminOnly>
  ),
  path: "categories",
};
