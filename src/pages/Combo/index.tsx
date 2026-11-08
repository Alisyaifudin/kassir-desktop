import { Outlet, type RouteObject } from "react-router";
import { AdminOnly } from "~/components/AdminOnly";
import { comboDetailRoute } from "./Detail/index";
import { newComboRoute } from "./New/index";
import Page from "./page";

function ComboAdminRoutes() {
  return (
    <AdminOnly fallback="/products">
      <Outlet />
    </AdminOnly>
  );
}

export const comboRoute: RouteObject = {
  path: "combos",
  Component: ComboAdminRoutes,
  children: [{ index: true, Component: Page }, newComboRoute, comboDetailRoute],
};
