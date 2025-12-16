import { z } from "zod";
import { db } from "~/database";
import { log, numeric } from "~/lib/utils";

const schema = z.object({
	id: numeric,
	name: z.string().min(1, { message: "Harus ada" }),
	value: z.string().min(1, { message: "Harus ada" }),
});

export async function editAction(formdata: FormData) {
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
	const { id, name, value } = parsed.data;
	const errMsg = await db.social.update(id, name, value);
	if (errMsg !== null) {
		return {
			global: errMsg,
		};
	}
	return undefined;
}
