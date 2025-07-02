import { lazy } from "react";
import { RouteObject } from "react-router";
import { useDB } from "~/hooks/use-db";
import { useStore } from "~/hooks/use-store";
import { useUser } from "~/hooks/use-user";

const Page = lazy(() => import("./Profile"));

export const route: RouteObject = {
	Component: () => {
		const user = useUser();
		const db = useDB();
		const store = useStore();
		return <Page context={{user, db, store}} />
	},
	path: "profile",
};
