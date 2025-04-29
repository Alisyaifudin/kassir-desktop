import { LoaderFunctionArgs, redirect, RouteObject } from "react-router";
import { lazy } from "react";
import { numeric } from "../../../lib/utils.ts";

const Page = lazy(() => import("./Product.tsx"));

export const route: RouteObject = {
	Component: Page,
	loader,
	path: ":id",
};

export async function loader({ params }: LoaderFunctionArgs) {
	const parsed = numeric.safeParse(params.id);
	if (!parsed.success) {
		return redirect("/stock");
	}
	return { id: parsed.data };
}
