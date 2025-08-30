import { lazy } from "react";
import { RouteObject } from "react-router";
import { Protect } from "~/components/Protect";
import { useDB } from "~/hooks/use-db";
import { useUser } from "~/hooks/use-user";

const Page = lazy(() => import("./Customer"));

export const route: RouteObject = {
	Component: () => {
		const user = useUser();
		const db = useDB();
		return (
			<Protect role={user.role} redirect="/setting/customer">
				<Page db={db} />
			</Protect>
		);
	},
	path: "customer",
};
