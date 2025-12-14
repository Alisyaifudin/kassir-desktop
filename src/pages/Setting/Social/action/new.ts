import { z } from "zod";
import { SubAction } from "~/lib/utils";
import { getContext } from "~/middleware/global";

const schema = z.object({
	name: z.string().min(1, { message: "Harus ada" }),
	value: z.string().min(1, { message: "Harus ada" }),
});

export async function newAction({ context, formdata }: SubAction) {
	const parsed = schema.safeParse({
		name: formdata.get("name"),
		value: formdata.get("value"),
	});
	if (!parsed.success) {
		const errs = parsed.error.flatten().fieldErrors;
		return {
			name: errs.name?.join("; "),
			value: errs.value?.join("; "),
		};
	}
	const { db } = getContext(context);
	const { name, value } = parsed.data;
	const errMsg = await db.social.add.one(name, value);
	if (errMsg !== null) {
		return {
			global: errMsg,
		};
	}
	return undefined;
}
