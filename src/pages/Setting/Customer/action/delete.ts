import { z } from "zod";
import { SubAction } from "~/lib/utils";
import { getContext } from "~/middleware/global";

const schema = z
	.string()
	.min(1, { message: "Harus ada" })
	.refine((val) => val !== "" || !isNaN(Number(val)), {
		message: "Harus angka",
	});

export async function deleteAction({ context, formdata }: SubAction) {
	const parsed = schema.safeParse(formdata.get("phone"));
	if (!parsed.success) {
		return parsed.error.flatten().formErrors.join("; ");
	}
	const phone = parsed.data;
	const { db } = getContext(context);
	const errMsg = await db.customer.del.byPhone(phone);
	return errMsg ?? undefined;
}
