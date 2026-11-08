import type { RouteObject } from "react-router";
import Page from "./page";

export const comboDetailRoute: RouteObject = {
  path: ":id",
  Component: Page,
};
