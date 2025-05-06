import { lazy } from "react";
import { RouteObject } from "react-router";
import { Auth } from "../../../components/Auth";

const Page = lazy(() => import("./Cashier"));

export const route: RouteObject = {
	Component: () => (
		<Auth admin redirect="/setting/profile">
			{(user) => <Page user={user} />}
		</Auth>
	),
	path: "cashier",
};
