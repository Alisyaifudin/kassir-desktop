import { RouteObject } from "react-router";
import { lazy } from "react";
import { Protect } from "~/components/Protect.tsx";
import { useUser } from "~/hooks/use-user.ts";
import { useDB } from "~/hooks/use-db.ts";

const Page = lazy(() => import("./New-Item.tsx"));

export const route: RouteObject = {
	Component: () => {
		const user = useUser();
		const db = useDB();
		return (
			<Protect redirect="/stock" role={user.role}>
				<Page db={db} />
			</Protect>
		);
	},
	path: "new",
};
