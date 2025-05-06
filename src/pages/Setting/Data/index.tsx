import { lazy } from "react";
import { RouteObject } from "react-router";
import { Auth } from "../../../components/Auth";

const Page = lazy(() => import("./Data"));

export const route: RouteObject = {
	Component: () => (
		<Auth admin redirect="/setting/profile">
			{() => <Page />}
		</Auth>
	),
	path: "data",
};
