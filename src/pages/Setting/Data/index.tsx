import { lazy } from "react";
import { RouteObject } from "react-router";
import { action } from "./action";
import { admin } from "~/middleware/admin";

const Page = lazy(() => import("./Data"));

export const route: RouteObject = {
	Component: Page,
	path: "data",
	middleware: [admin],
	action,
};
