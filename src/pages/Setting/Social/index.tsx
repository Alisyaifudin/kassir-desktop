import { lazy } from "react";
import { RouteObject } from "react-router";
import { Protect } from "~/components/Protect";
import { useDB } from "~/hooks/use-db";
import { useUser } from "~/hooks/use-user";

const Page = lazy(() => import("./Social"));

export const route: RouteObject = {
	Component: () => {
		const user = useUser();
		const db = useDB();
		return (
			<Protect redirect="/setting/profile" role={user.role}>
				<Page db={db} />
			</Protect>
		);
	},
	path: "social",
};
