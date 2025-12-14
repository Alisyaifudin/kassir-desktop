import { redirect } from "react-router";
import { auth } from "~/lib/auth";
import { ActionArgs } from "~/lib/utils";
import { getContext } from "~/middleware/global";

export async function action({ context }: ActionArgs) {
	const { store } = getContext(context);
	const errMsg = await auth.logout(store);
	if (errMsg === null) {
		throw redirect("/login");
	}
	return errMsg;
}

export type Action = typeof action;
