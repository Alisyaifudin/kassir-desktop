import { numeric, SubAction } from "~/lib/utils";
import { getContext } from "~/middleware/global";

export async function deleteAction({ context, formdata }: SubAction) {
	const parsed = numeric.safeParse(formdata.get("id"));
	if (!parsed.success) {
		return parsed.error.flatten().formErrors.join("; ");
	}
	const id = parsed.data;
	const { db } = getContext(context);
	const errMsg = await db.method.del.byId(id);
	return errMsg ?? undefined;
}
