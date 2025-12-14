import { redirect } from "react-router";
import { z } from "zod";
import { ActionArgs, numeric } from "~/lib/utils";
import { getUser } from "~/middleware/authenticate";
import { getContext } from "~/middleware/global";

const schema = z.object({
	name: z.string().min(1, { message: "Harus ada" }),
	value: numeric,
	kind: z.enum(["percent", "number"]),
});

export async function action({ context, request }: ActionArgs) {
	// new addtional
	const user = await getUser(context);
	if (user.role !== "admin") {
		throw new Error("Unauthorized");
	}
	const formdata = await request.formData();
	const parsed = schema.safeParse({
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
	const { value: val, kind, name } = parsed.data;
	let value = val;
	if (kind === "percent") {
		if (value < -100) {
			value = -100;
		} else if (value > 100) {
			value = 100;
		}
	}
	const [errMsg] = await db.additionalItem.add.one({ name, value, kind });
	if (errMsg) {
		return {
			global: errMsg,
		};
	}
	throw redirect(`/stock?tab=additional`);
}

export type Action = typeof action;
