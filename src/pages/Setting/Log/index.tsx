import { lazy } from "react";
import { RouteObject } from "react-router";

const Page = lazy(() => import("./Log"));

export const route: RouteObject = {
	Component: Page,
	path: "log",
};
