import { RouteObject } from "react-router";
import { lazy, Suspense } from "react";
import { Protect } from "~/components/Protect.tsx";
import { Loading } from "~/components/Loading.tsx";

const Page = lazy(() => import("./New-Item.tsx"));

export const route: RouteObject = {
	Component: () => (
		<Protect redirect="/stock">
			<Suspense fallback={<Loading />}>
				<Page />
			</Suspense>
		</Protect>
	),
	path: "new",
};
