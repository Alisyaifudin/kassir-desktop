import { lazy } from "react";
import { RouteObject } from "react-router";
import { Auth } from "../../../components/Auth";

const Page = lazy(() => import("./Profile"));

export const route: RouteObject = {
	Component: () => (
		<Auth admin redirect="/setting/profile">
			{() => <Page />}
		</Auth>
	),
	index: true,
};
