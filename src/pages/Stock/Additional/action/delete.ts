import { redirect } from "react-router";
import { SubAction } from "~/lib/utils";
import { getContext } from "~/middleware/global";

type Action = SubAction & {
	id: number;
};

export async function deleteAction({ context, id }: Action) {
	const { db } = getContext(context);
	const errMsg = await db.additionalItem.del.byId(id);
	if (errMsg) {
		return errMsg;
	}
	throw redirect("/stock?tab=additional");
}
