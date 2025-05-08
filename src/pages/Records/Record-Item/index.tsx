import { type LoaderFunctionArgs, redirect, type RouteObject } from "react-router";
import { lazy } from "react";
import { numeric } from "../../../lib/utils";
import { Auth } from "~/components/Auth";

const Page = lazy(() => import("./Record-Item"));

export const route: RouteObject = {
	path: ":timestamp",
	Component: () => <Auth redirect="/setting/profile">{(user) => <Page user={user} />}</Auth>,
	loader,
};

export function loader({ params }: LoaderFunctionArgs) {
	const parsed = numeric.safeParse(params.timestamp);
	if (!parsed.success) {
		return redirect("/records");
	}
	return { timestamp: parsed.data };
}
