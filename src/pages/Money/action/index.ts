import { ActionArgs } from "~/lib/utils";
import { getUser } from "~/middleware/authenticate";
import { newAction } from "./new";
import { deleteAction } from "./delete";

export async function action({ context, request }: ActionArgs) {
	const user = await getUser(context);
	if (user.role !== "admin") {
		throw new Error("Unauthorized");
	}
	const formdata = await request.formData();
	const action = formdata.get("action");
	switch (action) {
		case "new": {
			const error = await newAction({ formdata, context });
			return { error, action };
		}
		case "delete": {
			const error = await deleteAction({ formdata, context });
			return { error, action };
		}
		default:
			throw new Error(`Invalid action: ${action}`);
	}
}

export type Action = typeof action;
