import { lazy } from "react";
import { RouteObject } from "react-router";
import { action } from "./action";
import { loader } from "./loader";

const Page = lazy(() => import("./page"));

export const route: RouteObject = {
	Component: Page,
	action,
	loader,
	index: true,
};
