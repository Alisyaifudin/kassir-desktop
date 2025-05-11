import { lazy, Suspense } from "react";
import { RouteObject } from "react-router";
import { Loading } from "~/components/Loading";
import { Protect } from "~/components/Protect";

const Page = lazy(() => import("./Shop"));

export const route: RouteObject = {
	Component: () => (
		<Suspense fallback={<Loading />}>
			<Protect redirect="/setting/profile">
				<Page />
			</Protect>
		</Suspense>
	),
	index: true,
};
