import { lazy } from "react";
import { RouteObject } from "react-router";

const Page = lazy(() => import("./Profile"));

export const route: RouteObject = {
	Component: Page,
	index: true
};
