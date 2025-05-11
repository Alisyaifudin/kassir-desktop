import { lazy } from "react";
import { RouteObject } from "react-router";

const Page = lazy(() => import("./Login"));

export const route: RouteObject = {
	path: "login",
	Component: () => <Page />,
};
