import { RouteObject } from "react-router";
import { route as shopRoute } from "./shop";
import { route as dataRoute } from "./data";
import { route as cashierRoute } from "./cashier";
import { route as profileRoute } from "./profile";
import { route as socialRoute } from "./social";
import { route as methodRoute } from "./method";
import { route as logRoute } from "./log";
import { route as customerRouter } from "./customer";
import { lazy } from "react";
import { useDB } from "~/hooks/use-db";
import { useStore } from "~/hooks/use-store";
import { useUser } from "~/hooks/use-user";
import { toast } from "sonner";
import { useNotify } from "~/hooks/use-notification";
import { useRefetchShopname } from "~/hooks/use-refetch-shopname";

const Page = lazy(() => import("./Setting"));

export const route: RouteObject = {
	path: "setting",
	children: [
		profileRoute,
		shopRoute,
		dataRoute,
		socialRoute,
		cashierRoute,
		methodRoute,
		logRoute,
		customerRouter,
	],
	Component: () => {
		const db = useDB();
		const store = useStore();
		const user = useUser();
		const refetchName = useRefetchShopname();
		const notify = useNotify();
		return <Page toast={toast.error} notify={notify} context={{ db, store, user, refetchName }} />;
	},
};
