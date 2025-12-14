import { numeric, SubAction } from "~/lib/utils";
import { getContext } from "~/middleware/global";

export async function deleteAction({ context, formdata }: SubAction) {
	const parsed = numeric.safeParse(formdata.get("id"));
	if (!parsed.success) {
		const errs = parsed.error.flatten().formErrors.join("; ");
		return errs;
	}
	const { db } = getContext(context);
	const id = parsed.data;
	const errMsg = await db.social.del.byId(id);
	return errMsg ?? undefined;
}
