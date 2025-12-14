import { z } from "zod";
import { integer, SubAction } from "~/lib/utils";
import { getContext } from "~/middleware/global";

const schema = z.object({
	itemId: integer,
	productId: z.nullable(integer),
});

export async function linkProductAction({ formdata, context }: SubAction) {
	const parsed = schema.safeParse({
		itemId: formdata.get("item-id"),
		productId: formdata.get("product-id"),
	});
	if (!parsed.success) {
		const errs = parsed.error.flatten().fieldErrors;
		return {
			itemId: errs.itemId?.join("; "),
			productId: errs.productId?.join("; "),
		};
	}
	const { itemId, productId } = parsed.data;
	const { db } = getContext(context);
	const errMsg = await db.recordItem.update.productId(itemId, productId);
	if (errMsg) {
		return {
			global: errMsg,
		};
	}
	return undefined;
}
