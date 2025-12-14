import { z } from "zod";
import { SubAction } from "~/lib/utils";
import { getContext } from "~/middleware/global";

const schema = z.object({
	name: z.string().min(1, { message: "Harus ada" }),
	kind: z.enum(["transfer", "qris", "debit"]),
});

export async function newAction({ context, formdata }: SubAction) {
	const parsed = schema.safeParse({
		name: formdata.get("name"),
		kind: formdata.get("kind"),
	});
	if (!parsed.success) {
		return parsed.error.flatten().formErrors.join("; ");
	}
	const { name, kind } = parsed.data;
	const { db } = getContext(context);
	const errMsg = await db.method.add.one(name, kind);
	return errMsg ?? undefined;
}
