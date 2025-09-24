import { lazy } from "react";
import { RouteObject } from "react-router";
import { toast } from "sonner";

const Page = lazy(() => import("./page"));

export const route: RouteObject = {
	index: true,
	Component: () => {
		return <Page toast={toast.error} />;
	},
};
