import { redirect } from "react-router";
import { z } from "zod";
import { integer, numeric, SubAction } from "~/lib/utils";
import { getContext } from "~/middleware/global";

const schema = z.object({
	id: integer,
	name: z.string().min(1, { message: "Harus ada" }),
	value: numeric,
	kind: z.enum(["number", "percent"]),
});

export async function editAction({ context, formdata }: SubAction) {
	const parsed = schema.safeParse({
		id: formdata.get("id"),
		name: formdata.get("name"),
		value: formdata.get("value"),
		kind: formdata.get("kind"),
	});
	if (!parsed.success) {
		const errs = parsed.error.flatten().fieldErrors;
		return {
			name: errs.name?.join("; "),
			value: errs.value?.join("; "),
			kind: errs.kind?.join("; "),
		};
	}
	const { db } = getContext(context);
	const { value: val, kind, name, id } = parsed.data;
	let value = val;
	if (kind === "percent") {
		if (value < -100) {
			value = -100;
		} else if (value > 100) {
			value = 100;
		}
	}
	const errMsg = await db.additionalItem.update.one({ id, name, value, kind });
	if (errMsg) {
		return {
			global: errMsg,
		};
	}
	throw redirect(`/stock?tab=additional`);
}
