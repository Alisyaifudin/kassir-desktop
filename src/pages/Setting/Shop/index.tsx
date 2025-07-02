import { lazy } from "react";
import { RouteObject } from "react-router";
import { Protect } from "~/components/Protect";
import { useRefetchShopname } from "~/hooks/use-refetch-shopname";
import { useStore } from "~/hooks/use-store";
import { useUser } from "~/hooks/use-user";

const Page = lazy(() => import("./Shop"));

export const route: RouteObject = {
	Component: () => {
		const user = useUser();
		const store = useStore();
		const refetchName = useRefetchShopname();
		return (
			<Protect role={user.role} redirect="/setting/profile">
				<Page refetchName={refetchName} context={{ store }} />
			</Protect>
		);
	},
	index: true,
};
