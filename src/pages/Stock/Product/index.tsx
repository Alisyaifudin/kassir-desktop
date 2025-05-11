import { LoaderFunctionArgs, redirect, RouteObject } from "react-router";
import { lazy, Suspense } from "react";
import { numeric } from "~/lib/utils.ts";
import { Loading } from "~/components/Loading.tsx";

const Page = lazy(() => import("./Product.tsx"));

export const route: RouteObject = {
	Component: () => (
		<Suspense fallback={<Loading />}>
			<Page />
		</Suspense>
	),
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
