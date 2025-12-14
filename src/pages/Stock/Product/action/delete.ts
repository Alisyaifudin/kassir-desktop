import { redirect } from "react-router";
import { image } from "~/lib/image";
import { SubAction } from "~/lib/utils";
import { getContext } from "~/middleware/global";

type Action = SubAction & {
	id: number;
	backUrl: string;
};

export async function deleteAction({ context, id, backUrl }: Action) {
	const { db } = getContext(context);
	const [errMsg, imageNames] = await db.product.del.byId(id);
	if (errMsg) {
		return errMsg;
	}
	for (const name of imageNames) {
		image.del(name);
	}
	throw redirect(backUrl);
}
