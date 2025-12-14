import { nameAction } from "./change-name";
import { passwordAction } from "./change-password";
import { ActionArgs } from "~/lib/utils";

export async function action({ request, context }: ActionArgs) {
	const formdata = await request.formData();
	const action = formdata.get("action");
	switch (action) {
		case "change-name": {
			const error = await nameAction({ context, formdata });
			return { error, action };
		}
		case "change-password": {
			const error = await passwordAction({ context, formdata });
			return { error, action };
		}
		default:
			throw new Error(`Invalid action: ${action}`);
	}
}

export type Action = typeof action;
