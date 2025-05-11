import { RouteObject } from "react-router";
import { lazy } from "react";
import { Protect } from "~/components/Protect.tsx";

const Page = lazy(() => import("./New-Item.tsx"));

export const route: RouteObject = {
	Component: () => (
		<Protect redirect="/stock">
			<Page />
		</Protect>
	),
	path: "new",
};
