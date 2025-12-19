import { redirect } from "react-router";
import { db } from "~/database";
import { integer,  } from "~/lib/utils";


export async function changeTimestampAction(timestamp: number, formdata: FormData) {
	const parsed = integer.safeParse(formdata.get("timestamp"));
	if (!parsed.success) {
		const errs = parsed.error.flatten().formErrors;
		return errs.join("; ");
	}
	const newTime = parsed.data;
	const errMsg = await db.record.update.timestamp(timestamp, newTime);
	if (errMsg) {
		return errMsg;
	}
	throw redirect(`/records/${newTime}?tab=detail`);
}
