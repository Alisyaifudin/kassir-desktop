import { lazy } from "react";
import { RouteObject } from "react-router";
import { admin } from "~/middleware/admin";
import { loader } from "./loader";
import { action } from "./action";

const Page = lazy(() => import("./page"));

export const route: RouteObject = {
	middleware: [admin],
	Component: Page,
	path: "cashier",
	loader,
	action,
};
