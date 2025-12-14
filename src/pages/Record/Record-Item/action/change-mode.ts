import { z } from "zod";
import { SubAction } from "~/lib/utils";
import { getContext } from "~/middleware/global";

type Action = SubAction & { timestamp: number };

export async function changeModeAction({ formdata, context, timestamp }: Action) {
	const parsed = z.enum(["sell", "buy"]).safeParse(formdata.get("mode"));
	if (!parsed.success) {
		const errs = parsed.error.flatten().formErrors;
		return errs.join("; ");
	}
	const mode = parsed.data;
	const { db } = getContext(context);
	const errMsg = await db.record.update.mode(timestamp, mode);
	return errMsg ?? undefined;
}
