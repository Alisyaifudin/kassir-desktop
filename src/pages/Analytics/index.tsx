import { lazy } from "react";
import { RouteObject } from "react-router";
import { Protect } from "~/components/Protect";
import { useDB } from "~/hooks/use-db";
import { useUser } from "~/hooks/use-user";

const Page = lazy(() => import("./Analytics"));

export const route: RouteObject = {
	path: "analytics",
	Component: () => {
		const user = useUser();
		const db = useDB();
		return (
			<Protect role={user.role} redirect="/setting/profile">
				<Page db={db} />
			</Protect>
		);
	},
};
