import { z } from "zod";
import { auth } from "~/lib/auth";
import { getContext } from "~/middleware/global";
import { SubAction } from "~/lib/utils";

export async function newAction({ context, formdata }: SubAction) {
	const parsed = z.string().safeParse(formdata.get("name"));
	if (!parsed.success) {
		return parsed.error.flatten().formErrors.join("; ");
	}
	const name = parsed.data;
	const [errMsg, hash] = await auth.hash("");
	if (errMsg) return errMsg;
	const { db } = getContext(context);
	const errAdd = await db.cashier.add.one(name, "user", hash);
	return errAdd ?? undefined;
}
