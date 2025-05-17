import { lazy } from "react";
import { RouteObject } from "react-router";

const Page = lazy(() => import("./Method"));

export const route: RouteObject = {
	Component: Page,
	path: "method",
};
