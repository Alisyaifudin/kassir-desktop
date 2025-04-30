import { lazy } from "react";
import { RouteObject } from "react-router";

const Page = lazy(() => import("../Sell"));

export const route: RouteObject = { index: true, Component: Page };
