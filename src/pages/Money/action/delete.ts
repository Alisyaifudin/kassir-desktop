import { numeric, SubAction } from "~/lib/utils";
import { getContext } from "~/middleware/global";

export async function deleteAction({ formdata, context }: SubAction) {
	const parsed = numeric.safeParse(formdata.get("timestamp"));
	if (!parsed.success) {
		return parsed.error.flatten().formErrors.join("; ");
	}
	const timestamp = parsed.data;
	const { db } = getContext(context);
	const errMsg = await db.money.del.byTimestamp(timestamp);
	return errMsg ?? undefined;
}
