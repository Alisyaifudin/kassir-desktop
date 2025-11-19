import { lazy } from "react";
import { RouteObject } from "react-router";
import { useDB } from "~/store/db";
import { useStore } from "~/store/store";

const Page = lazy(() => import("./Login"));

export const route: RouteObject = {
	path: "login",
	Component: () => {
		const db = useDB();
		const store = useStore();
		return <Page context={{ db, store }} />;
	},
};
