import { z } from "zod";
import { SubAction } from "~/lib/utils";
import { getContext } from "~/middleware/global";

export async function updateNameAction({ context, formdata }: SubAction) {
	const parsed = z
		.object({
			oldName: z.string().min(1, { message: "Harus ada" }),
			newName: z.string().min(1, { message: "Harus ada" }),
		})
		.safeParse({
			oldName: formdata.get("old-data"),
			newName: formdata.get("new-data"),
		});
	if (!parsed.success) {
		return parsed.error.flatten().fieldErrors.newName?.join("; ");
	}
	const { oldName, newName } = parsed.data;
	const { db } = getContext(context);
	const errMsg = await db.cashier.update.name(oldName, newName);
	return errMsg ?? undefined;
}
