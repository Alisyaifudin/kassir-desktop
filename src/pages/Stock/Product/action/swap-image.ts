import { z } from "zod";
import { integer, SubAction } from "~/lib/utils";
import { getContext } from "~/middleware/global";

const schema = z.object({
	a: integer,
	b: integer,
});

export async function swapImageAction({ context, formdata }: SubAction) {
	const parsed = schema.safeParse({
		a: formdata.get("a"),
		b: formdata.get("b"),
	});
	if (!parsed.success) {
		return parsed.error.flatten().formErrors.join("; ");
	}
	const { a, b } = parsed.data;
	const { db } = getContext(context);
	const errMsg = await db.image.update.swap(a, b);
	return errMsg ?? undefined;
}
