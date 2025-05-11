import { type LoaderFunctionArgs, redirect, type RouteObject } from "react-router";
import { lazy, Suspense } from "react";
import { numeric } from "../../../lib/utils";
import { Loading } from "~/components/Loading";

const Page = lazy(() => import("./Record-Item"));

export const route: RouteObject = {
	path: ":timestamp",
	Component: () => (
			<Suspense fallback={<Loading />}>
				<Page />
			</Suspense>
		),
	loader,
};

export function loader({ params }: LoaderFunctionArgs) {
	const parsed = numeric.safeParse(params.timestamp);
	if (!parsed.success) {
		return redirect("/records");
	}
	return { timestamp: parsed.data };
}
