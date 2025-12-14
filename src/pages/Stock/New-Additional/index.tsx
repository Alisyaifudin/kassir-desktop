import { RouteObject } from "react-router";
import { lazy } from "react";
import { loader } from "./loader.ts";
import { action } from "./action.ts";
import { admin } from "~/middleware/admin.ts";

const Page = lazy(() => import("./page.tsx"));

export const route: RouteObject = {
	Component: Page,
	middleware: [admin],
	loader,
	action,
	path: "additional/new",
};
