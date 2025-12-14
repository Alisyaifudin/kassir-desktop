import { getUser } from "~/middleware/authenticate";
import { newAction } from "./new";
import { deleteAction } from "./delete";
import { updateNameAction } from "./update-name";
import { updateRoleAction } from "./update-role";
import { ActionArgs } from "~/lib/utils";

export async function action({ context, request }: ActionArgs) {
	const user = await getUser(context);
	if (user.role !== "admin") {
		throw new Error("Unauthorized");
	}
	const formdata = await request.formData();
	const action = formdata.get("action");
	switch (action) {
		case "new": {
			const error = await newAction({ context, formdata });
			return { error, action };
		}
		case "delete": {
			const error = await deleteAction({ context, formdata });
			return { error, action };
		}
		case "update-name": {
			const error = await updateNameAction({ context, formdata });
			return { error, action };
		}
		case "update-role": {
			const error = await updateRoleAction({ context, formdata });
			return { error, action };
		}
		default:
			throw new Error("Invalid action");
	}
}

export type Action = typeof action;
