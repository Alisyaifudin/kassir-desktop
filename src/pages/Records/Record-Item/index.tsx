import { type LoaderFunctionArgs, redirect, type RouteObject } from "react-router";
import { lazy } from "react";
import { numeric } from "../../../utils";

const Page = lazy(() => import("./Record-Item"));

export const route: RouteObject = {
	path: ":timestamp",
	Component: Page,
	loader,
};

export function loader({ params }: LoaderFunctionArgs) {
	const parsed = numeric.safeParse(params.timestamp);
	if (!parsed.success) {
		return redirect("/records");
	}
	return { timestamp: parsed.data };
}
