import { lazy } from "react";
import { RouteObject } from "react-router";

const Page = lazy(() => import("./Analytics"));

export const route: RouteObject = { path: "analytics", Component: Page };
