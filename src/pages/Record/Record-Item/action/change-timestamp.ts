import { redirect } from "react-router";
import { integer, SubAction } from "~/lib/utils";
import { getContext } from "~/middleware/global";

type Action = SubAction & { timestamp: number };

export async function changeTimestampAction({ formdata, context, timestamp }: Action) {
	const parsed = integer.safeParse(formdata.get("timestamp"));
	if (!parsed.success) {
		const errs = parsed.error.flatten().formErrors;
		return errs.join("; ");
	}
	const newTime = parsed.data;
	const { db } = getContext(context);
	const [errMsg] = await db.record.update.timestamp(timestamp, newTime);
	if (errMsg) {
		return errMsg;
	}
	throw redirect(`/records/${newTime}?tab=detail`);
}
