import { RouteObject } from "react-router";
import { loader } from "./Record-Item";
import { lazy } from "react";

const Page = lazy(() => import("./Record-Item"));

export const route: RouteObject = {
	path: ":timestamp",
	Component: Page,
	loader,
};
