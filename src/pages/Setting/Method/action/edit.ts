import { z } from "zod";
import { numeric, SubAction } from "~/lib/utils";
import { getContext } from "~/middleware/global";

const schema = z.object({
	name: z.string().min(1, { message: "Harus ada" }),
	id: numeric,
});

export async function editAction({ context, formdata }: SubAction) {
	const parsed = schema.safeParse({
		name: formdata.get("name"),
		id: formdata.get("id"),
	});
	if (!parsed.success) {
		return parsed.error.flatten().formErrors.join("; ");
	}
	const { name, id } = parsed.data;
	const { db } = getContext(context);
	const errMsg = await db.method.update.one(id, name);
	return errMsg ?? undefined;
}
