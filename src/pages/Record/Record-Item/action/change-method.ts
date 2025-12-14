import { integer, METHOD_BASE_ID, SubAction } from "~/lib/utils";
import { getContext } from "~/middleware/global";

type Action = SubAction & { timestamp: number };

export async function changeMethodAction({ formdata, context, timestamp }: Action) {
	const parsed = integer.safeParse(formdata.get("method-id"));
	if (!parsed.success) {
		const errs = parsed.error.flatten().formErrors;
		return { message: errs.join("; ") };
	}
	const methodId = parsed.data;
	const { db } = getContext(context);
	const errMsg = await db.record.update.method(timestamp, methodId);
	if (errMsg) {
		return { message: errMsg };
	}
	if (Object.values(METHOD_BASE_ID).includes(methodId as any)) {
		return { close: false };
	}
	return { close: true };
}
