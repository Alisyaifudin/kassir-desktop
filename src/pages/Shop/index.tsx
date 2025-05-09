import { lazy } from "react";
import { RouteObject } from "react-router";
import { Auth } from "~/components/Auth";

const Page = lazy(() => import("./Shop"));

export const route: RouteObject = {
	path: "shop",
	Component: () => <Auth redirect="/shop">{(user) => <Page user={user} />}</Auth>,
};
