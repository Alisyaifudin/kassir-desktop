import { useNavigate } from "react-router";
import { toast } from "sonner";
import { useAction } from "~/hooks/useAction";
import { auth } from "~/lib/auth";
import { useStore } from "~/RootLayout";

export function useLogout() {
	const store = useStore();
	const { action, loading } = useAction("", async () => {
		return await auth.logout(store);
	});
	const navigate = useNavigate();

	const handleLogout = async () => {
		const errMsg = await action();
		if (errMsg) {
			toast.error(errMsg);
			return;
		}
		navigate("/login");
	};
	return { handleLogout, loading };
}
