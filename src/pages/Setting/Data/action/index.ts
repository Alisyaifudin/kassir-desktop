import { getUser } from "~/middleware/authenticate";
import { productAction } from "./product";
import { recordAction } from "./record";
import { ActionArgs } from "~/lib/utils";

export async function action({ context, request }: ActionArgs) {
	const user = await getUser(context);
	if (user.role !== "admin") {
		throw new Error("Unauthorized");
	}
	const formdata = await request.formData();
	const action = formdata.get("action");
	switch (action) {
		case "product": {
			const res = await productAction({ context, formdata });
			return { res, action };
		}
		case "record": {
			const res = await recordAction({ context, formdata });
			return { res, action };
		}
		default:
			throw new Error("Invalid action");
	}
}

export type Action = typeof action;
