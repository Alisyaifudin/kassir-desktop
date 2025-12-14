import { z } from "zod";
import { SubAction } from "~/lib/utils";
import { getContext } from "~/middleware/global";

const schema = z.object({
	name: z.string().min(1, { message: "Harus ada" }),
	phone: z
		.string()
		.min(1, { message: "Harus adaj" })
		.refine((val) => val !== "" || !isNaN(Number(val)), {
			message: "Harus angka",
		}),
});

export async function editAction({ context, formdata }: SubAction) {
	const parsed = schema.safeParse({
		name: formdata.get("name"),
		phone: formdata.get("phone"),
	});
	if (!parsed.success) {
		return parsed.error.message;
	}
	const { name, phone } = parsed.data;
	const { db } = getContext(context);
	const errMsg = await db.customer.update.name(phone, name);
	return errMsg ?? undefined;
}
