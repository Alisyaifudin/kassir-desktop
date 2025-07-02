import { lazy } from "react";
import { RouteObject } from "react-router";
import { toast } from "sonner";
import { Protect } from "~/components/Protect";
import { useUser } from "~/hooks/use-user";

const Page = lazy(() => import("./Log"));

export const LOG_PATH = "logs/kassir.log";

export const route: RouteObject = {
	Component: () => {
		const user = useUser();
		return (
			<Protect role={user.role} redirect="/setting/profile">
				<Page logPath={LOG_PATH} toast={toast.success} />
			</Protect>
		);
	},
	path: "log",
};
