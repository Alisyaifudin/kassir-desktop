import { CheckedState } from "@radix-ui/react-checkbox";
import { useAction } from "~/hooks/useAction";
import { setProfile } from "./utils";
import { tryResult } from "~/lib/utils";
import { toast } from "sonner";
import { Store } from "~/lib/store";

export function useCheckbox(context: {store: Store}) {
	const { loading, action, error } = useAction("", async (check: CheckedState) => {
		const [errMsg] = await tryResult({
			run: () =>
				setProfile(context.store.profile, {
					showCashier: check ? "true" : "false",
				}),
		});
		return errMsg;
	});
	const handleChangeShowCashier = async (e: CheckedState) => {
		const errMsg = await action(e);
		if (errMsg !== null) {
			toast.error(errMsg);
		}
	};
	return { loading, error, handleChangeShowCashier };
}
