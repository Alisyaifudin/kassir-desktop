import { RouteObject } from "react-router";
import { lazy } from "react";
import { loader } from "./loader.ts";
import { action } from "./action/index.ts";

const Page = lazy(() => import("./page.tsx"));

export const route: RouteObject = {
	Component: Page,
	loader,
	action,
	path: "additional/:id",
};
