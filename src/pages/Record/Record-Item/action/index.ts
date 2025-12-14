import { redirect } from "react-router";
import { ActionArgs, integer } from "~/lib/utils";
import { getUser } from "~/middleware/authenticate";
import { payCreditAction } from "./pay-credit";
import { linkProductAction } from "./link-product";
import { editNoteAction } from "./edit-note";
import { changeTimestampAction } from "./change-timestamp";
import { changeModeAction } from "./change-mode";
import { changeMethodAction } from "./change-method";
import { toCreditAction } from "./to-credit";

export async function action({ context, request, params }: ActionArgs) {
	const parsed = integer.safeParse(params.timestamp);
	if (!parsed.success) {
		throw redirect("/records");
	}
	const timestamp = parsed.data;
	const user = await getUser(context);
	if (user.role !== "admin") {
		throw new Error("Unauthorized");
	}
	const formdata = await request.formData();
	const action = formdata.get("action");
	switch (action) {
		case "pay-credit": {
			const error = await payCreditAction({ formdata, timestamp, context });
			return { error, action };
		}
		case "to-credit": {
			const error = await toCreditAction({ formdata, timestamp, context });
			return { error, action };
		}
		case "link-product": {
			const error = await linkProductAction({ formdata, context });
			return { error, action };
		}
		case "edit-note": {
			const error = await editNoteAction({ formdata, timestamp, context });
			return { error, action };
		}
		case "change-timestamp": {
			const error = await changeTimestampAction({ formdata, timestamp, context });
			return { error, action };
		}
		case "change-mode": {
			const error = await changeModeAction({ formdata, timestamp, context });
			return { error, action };
		}
		case "change-method": {
			const error = await changeMethodAction({ formdata, timestamp, context });
			return { error, action };
		}
		default:
			throw new Error(`Invalid action: ${action}`);
	}
}

export type Action = typeof action;
