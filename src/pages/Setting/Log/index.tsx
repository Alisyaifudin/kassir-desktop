import { lazy } from "react";
import { RouteObject } from "react-router";
import { loader } from "./loader";
import { action } from "./action";
import { admin } from "~/middleware/admin";

const Page = lazy(() => import("./page"));

export const route: RouteObject = {
	Component: Page,
	middleware: [admin],
	path: "log",
	loader,
	action
};
