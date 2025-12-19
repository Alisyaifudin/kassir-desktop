import { db } from "~/database";


export async function toCreditAction(timestamp: number) {
	const errMsg = await db.record.update.toCredit(timestamp);
	return errMsg ?? undefined;
}
