import Decimal from "decimal.js";
import { z } from "zod";
import { numeric, SubAction } from "~/lib/utils";
import { getContext } from "~/middleware/global";

const schema = z.object({
	pay: numeric,
	rounding: numeric,
	grandTotal: numeric,
});

type Action = SubAction & { timestamp: number };

// ATTENTION!!! We trust the client formdata 'grand-total' because both the client
// this `action` actually run client side 😅 so it's ok
// BUT! If you move this function to dedicated server, YOU SHOULD CHANGE THE SIGNATURE!!!
export async function payCreditAction({ formdata, context, timestamp }: Action) {
	const parsed = schema.safeParse({
		pay: formdata.get("pay"),
		rounding: formdata.get("rounding"),
		grandTotal: formdata.get("grand-total"),
	});
	if (!parsed.success) {
		const errs = parsed.error.flatten().fieldErrors;
		return {
			pay: errs.pay?.join("; "),
			rounding: errs.rounding?.join("; "),
		};
	}
	const { pay, rounding, grandTotal } = parsed.data;
	if (new Decimal(grandTotal).plus(rounding) > new Decimal(pay)) {
		return {
			global: "Tidak cukup",
		};
	}
	const { db } = getContext(context);
	const errMsg = await db.record.update.payCredit(timestamp, { pay, rounding });
	if (errMsg) {
		return {
			global: errMsg,
		};
	}
	return undefined;
}
