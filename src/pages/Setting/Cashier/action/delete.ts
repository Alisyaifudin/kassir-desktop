import { z } from "zod";
import { SubAction } from "~/lib/utils";
import { getContext } from "~/middleware/global";

export async function deleteAction({ context, formdata }: SubAction) {
	const parsed = z.string().min(1, { message: "Harus ada" }).safeParse(formdata.get("name"));
	if (!parsed.success) {
		return parsed.error.flatten().formErrors.join("; ");
	}
	const name = parsed.data;
	const { db } = getContext(context);
	const errMsg = await db.cashier.del.byName(name);
	return errMsg ?? undefined;
}
