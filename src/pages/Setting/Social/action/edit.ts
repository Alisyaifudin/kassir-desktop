import { z } from "zod";
import { log, numeric, SubAction } from "~/lib/utils";
import { getContext } from "~/middleware/global";

const schema = z.object({
	id: numeric,
	name: z.string().min(1, { message: "Harus ada" }),
	value: z.string().min(1, { message: "Harus ada" }),
});

export async function editAction({ context, formdata }: SubAction) {
	const parsed = schema.safeParse({
		id: formdata.get("id"),
		name: formdata.get("name"),
		value: formdata.get("value"),
	});
	if (!parsed.success) {
		const errs = parsed.error.flatten().fieldErrors;
		log.error(parsed.error.message);
		return {
			name: errs.name?.join("; "),
			value: errs.value?.join("; "),
		};
	}
	const { db } = getContext(context);
	const { id, name, value } = parsed.data;
	const errMsg = await db.social.update.one(id, name, value);
	if (errMsg !== null) {
		return {
			global: errMsg,
		};
	}
	return undefined;
}
