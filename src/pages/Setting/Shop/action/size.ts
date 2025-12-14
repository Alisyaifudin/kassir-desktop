import { z } from "zod";
import { SubAction, tryResult } from "~/lib/utils";
import { getContext } from "~/middleware/global";

export async function action({ context, formdata }: SubAction) {
	const parsed = z.enum(["big", "small"]).safeParse(formdata.get("size"));
	if (!parsed.success) {
		return parsed.error.flatten().formErrors.join("; ");
	}
	const size = parsed.data;
	const { store } = getContext(context);
	const [errMsg] = await tryResult({
		run: () => store.set({ size }),
	});
	return errMsg ?? undefined;
}
