import { RouteObject } from "react-router";
import { lazy } from "react";
import { admin } from "~/middleware/admin.ts";
import { loader } from "./loader.ts";
import { action } from "./action";

const Page = lazy(() => import("./page.tsx"));

export const route: RouteObject = {
	middleware: [admin],
	Component: Page,
	loader,
	action,
	path: "product/new",
};
