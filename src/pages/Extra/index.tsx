import { RouteObject } from "react-router";
import { newExtraRoute } from "./New/index.tsx";
import { extraDetailRoute } from "./Detail/index.tsx";
import Page from "./page.tsx";

export const extraRoute: RouteObject = {
  path: "extras",
  children: [{ index: true, Component: Page }, newExtraRoute, extraDetailRoute],
};
