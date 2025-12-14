import { SubAction } from "~/lib/utils";
import { getContext } from "~/middleware/global";

type Action = SubAction & { timestamp: number };

export async function toCreditAction({ context, timestamp }: Action) {
	const { db } = getContext(context);
	const errMsg = await db.record.update.toCredit(timestamp);
	return errMsg ?? undefined;
}
