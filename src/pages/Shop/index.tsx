import { lazy } from "react";
import { RouteObject } from "react-router";

const Page = lazy(() => import("./Shop"));

export const route: RouteObject = { path: "shop", Component: Page };
