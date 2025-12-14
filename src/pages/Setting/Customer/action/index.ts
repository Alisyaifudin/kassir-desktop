import { getUser } from "~/middleware/authenticate";
import { editAction } from "./edit";
import { newAction } from "./new";
import { deleteAction } from "./delete";
import { ActionArgs } from "~/lib/utils";

export async function action({ context, request }: ActionArgs) {
	const user = await getUser(context);
	if (user.role !== "admin") {
		throw new Error("Unauthorized");
	}
	const formdata = await request.formData();
	const action = formdata.get("action");
	switch (action) {
		case "edit": {
			const error = await editAction({ context, formdata });
			return { error, action };
		}
		case "new": {
			const error = await newAction({ context, formdata });
			return { error, action };
		}
		case "delete": {
			const error = await deleteAction({ context, formdata });
			return { error, action };
		}
		default:
			throw new Error(`Invalid action: ${action}`);
	}
}

export type Action = typeof action;
