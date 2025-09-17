import { lazy } from "react";
import { RouteObject } from "react-router";
import { toast } from "sonner";
import { useDB } from "~/hooks/use-db";

const Page = lazy(() => import("./page"));

export const route: RouteObject = {
	index: true,
	Component: () => {
		const db = useDB();
		return <Page db={db} toast={toast.error} />;
	},
};
