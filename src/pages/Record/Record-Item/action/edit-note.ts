import { z } from "zod";
import { SubAction } from "~/lib/utils";
import { getContext } from "~/middleware/global";

type Action = SubAction & { timestamp: number };

export async function editNoteAction({ formdata, context, timestamp }: Action) {
	const parsed = z.string().safeParse(formdata.get("note"));
	if (!parsed.success) {
		const errs = parsed.error.flatten().formErrors;
		return errs.join("; ");
	}
	const note = parsed.data;
	const { db } = getContext(context);
	const errMsg = await db.record.update.note(timestamp, note);
	return errMsg ?? undefined;
}
