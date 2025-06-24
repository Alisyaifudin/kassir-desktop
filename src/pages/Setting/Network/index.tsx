import { lazy } from "react";
import { RouteObject } from "react-router";
import { Protect } from "~/components/Protect";

const Page = lazy(() => import("./Network"));

export const route: RouteObject = {
	Component: () => (
		<Protect redirect="/setting/profile">
			<Page />
		</Protect>
	),
	path: "network",
};
