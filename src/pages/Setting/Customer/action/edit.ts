import { z } from "zod";
import { db } from "~/database";
import { integer } from "~/lib/utils";

const schema = z.object({
	id: integer,
	name: z.string().min(1, { message: "Harus ada" }),
	phone: z
		.string()
		.min(1, { message: "Harus adaj" })
		.refine((val) => val !== "" || !isNaN(Number(val)), {
			message: "Harus angka",
		}),
});

export async function editAction(formdata: FormData) {
	const parsed = schema.safeParse({
		id: formdata.get("id"),
		name: formdata.get("name"),
		phone: formdata.get("phone"),
	});
	if (!parsed.success) {
		return parsed.error.message;
	}
	const { name, phone, id } = parsed.data;
	const errMsg = await db.customer.update(id, name, phone);
	return errMsg ?? undefined;
}
