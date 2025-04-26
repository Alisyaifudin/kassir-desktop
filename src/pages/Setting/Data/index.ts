import { lazy } from "react";
import { RouteObject } from "react-router";

const Page = lazy(() => import("./Data"));

export const route: RouteObject = {
	Component: Page,
	path: "data",
};
