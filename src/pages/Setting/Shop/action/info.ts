import { z } from "zod";
import { SubAction, tryResult } from "~/lib/utils";
import { getContext } from "~/middleware/global";

const schema = z.object({
	owner: z.string(),
	header: z.string(),
	footer: z.string(),
	address: z.string(),
});

export async function action({ context, formdata }: SubAction) {
	const parsed = schema.safeParse({
		owner: formdata.get("owner"),
		header: formdata.get("header"),
		footer: formdata.get("footer"),
		address: formdata.get("address"),
	});
	if (!parsed.success) {
		return parsed.error.message;
	}
	const data = parsed.data;
	const { store } = getContext(context);
	const [errMsg] = await tryResult({
		run: () => store.set(data),
	});
	return errMsg ?? undefined;
}
