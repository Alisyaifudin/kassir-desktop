import { SubAction, tryResult } from "~/lib/utils";
import { getContext } from "~/middleware/global";

export async function action({ context, formdata }: SubAction) {
	const checked = formdata.get("check") === "true";
	const { store } = getContext(context);
	const [errMsg] = await tryResult({
		run: () => store.set({ showCashier: String(checked) }),
	});
	return errMsg ?? undefined;
}
