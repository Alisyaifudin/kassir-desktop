import type { NavigateFunction } from "react-router";
import { useAction } from "~/hooks/useAction";
import { auth } from "~/lib/auth";
import type { Store } from "~/lib/store";

export function useLogout(store: Store, navigate: NavigateFunction, toast: (text: string) => void) {
	const { action, loading } = useAction("", async () => {
		return await auth.logout(store);
	});
	const handleLogout = async () => {
		const errMsg = await action();
		if (errMsg) {
			toast(errMsg);
			return;
		}
		navigate("/login");
	};
	return { handleLogout, loading };
}
