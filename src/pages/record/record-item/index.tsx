import { type RouteObject } from "react-router";
import { lazy } from "react";
import { loader } from "./loader";
import { action } from "./action";

const Page = lazy(() => import("./page"));

export const route: RouteObject = {
	path: ":timestamp",
	Component: Page,
	loader,
	action,
};
