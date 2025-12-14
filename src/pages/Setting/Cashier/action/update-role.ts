import { z } from "zod";
import { SubAction } from "~/lib/utils";
import { getContext } from "~/middleware/global";

export async function updateRoleAction({ context, formdata }: SubAction) {
	const parsed = z
		.object({
			name: z.string().min(1, { message: "Harus ada" }),
			role: z.enum(["admin", "user"]),
		})
		.safeParse({
			name: formdata.get("name"),
			role: formdata.get("role"),
		});
	if (!parsed.success) {
		return parsed.error.message;
	}
	const { name, role } = parsed.data;
	const { db } = getContext(context);
	const errMsg = await db.cashier.update.role(name, role);
	return errMsg ?? undefined;
}
