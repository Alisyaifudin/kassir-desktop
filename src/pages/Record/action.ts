import { redirect } from "react-router";
import { ActionArgs, integer } from "~/lib/utils";
import { getUser } from "~/middleware/authenticate";
import { getContext } from "~/middleware/global";

export async function action({ context, request }: ActionArgs) {
	const user = await getUser(context);
	if (user.role !== "admin") {
		throw new Error("Unauthorized");
	}
	const formdata = await request.formData();
	const parsed = integer.safeParse(formdata.get("timestamp"));
	if (!parsed.success) {
		return parsed.error.flatten().formErrors.join("; ");
	}
	const timestamp = parsed.data;
	const { db } = getContext(context);
	const errMsg = await db.record.del.byTimestamp(timestamp);
	if (errMsg) {
		return errMsg;
	}
	const url = new URL(request.url);
	url.searchParams.delete("selected");
	throw redirect(url.href);
}

export type Action = typeof action;
