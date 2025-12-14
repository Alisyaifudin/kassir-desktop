import { redirect } from "react-router";
import { ActionArgs, integer } from "~/lib/utils";
import { editAction } from "./edit";
import { deleteAction } from "./delete";
import { getUser } from "~/middleware/authenticate";

export async function action({ params, context, request }: ActionArgs) {
	const parsed = integer.safeParse(params.id);
	if (!parsed.success) {
		throw redirect("/stock?tab=additional");
	}
	const id = parsed.data;
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
		case "delete": {
			const error = await deleteAction({ context, formdata, id });
			return { error, action };
		}
		default:
			throw new Error(`Invalid action: ${action}`);
	}
}

export type Action = typeof action;
