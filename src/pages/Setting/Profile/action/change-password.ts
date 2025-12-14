import { z } from "zod";
import { SubAction } from "~/lib/utils";
import { getUser } from "~/middleware/authenticate";
import { getContext } from "~/middleware/global";

export async function passwordAction({ context, formdata }: SubAction) {
	const parsed = z.string().safeParse(formdata.get("password"));
	if (!parsed.success) {
		return parsed.error.message;
	}
	const password = parsed.data;
	const user = await getUser(context);
	const { db } = getContext(context);
	const errMsg = await db.cashier.update.password(user.name, password);
	return errMsg ?? undefined;
}
