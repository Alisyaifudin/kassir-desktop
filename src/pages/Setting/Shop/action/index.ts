import { action as sizeAction } from "./size";
import { action as infoAction } from "./info";
import { action as showCashierAction } from "./show-cashier";
import { getUser } from "~/middleware/authenticate";
import { ActionArgs } from "~/lib/utils";

export async function action({ context, request }: ActionArgs) {
	const user = await getUser(context);
	if (user.role !== "admin") {
		throw new Error("Unauthorized");
	}
	const formdata = await request.formData();
	const action = formdata.get("action");
	switch (action) {
		case "size": {
			const error = await sizeAction({ context, formdata });
			return {
				action,
				error,
			} as const;
		}
		case "info": {
			const error = await infoAction({ context, formdata });
			return {
				action,
				error,
			} as const;
		}
		case "show-cashier": {
			const error = await showCashierAction({ context, formdata });
			return {
				action,
				error,
			} as const;
		}
		default:
			throw new Error("Invalid action");
	}
}

export type Action = typeof action;
