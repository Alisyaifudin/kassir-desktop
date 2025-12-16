import { lazy } from "react";
import { RouteObject } from "react-router";
import { action } from "./action";

const Page = lazy(() => import("./page"));

export const route: RouteObject = {
	Component: Page,
	action,
	index: true,
};
