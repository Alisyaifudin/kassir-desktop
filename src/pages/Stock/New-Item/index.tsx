import { RouteObject } from "react-router";
import { lazy } from "react";

const Page = lazy(() => import("./New-Item.tsx"));

export const route: RouteObject = {
	Component: Page,
	path: "new",
};
