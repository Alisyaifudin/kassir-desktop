import { useAction } from "~/hooks/useAction";
import { Store } from "~/lib/store";
import { tryResult } from "~/lib/utils";
import { setProfile } from "./utils";
import { toast } from "sonner";
import { useSize as useSizeHook } from "~/hooks/use-size";

export function useSize(context: { store: Store }) {
	const size = useSizeHook();
	const { loading, action, error } = useAction("", async (size: string) => {
		const [errMsg] = await tryResult({
			run: () =>
				setProfile(context.store.profile, {
					size,
				}),
		});
		return errMsg;
	});
	const handleChangeSize = async (e: string) => {
		const errMsg = await action(e);
		if (errMsg !== null) {
			toast.error(errMsg);
		} else {
			window.location.reload();
		}
	};
	return { size, loading, error, handleChangeSize } as const;
}
