import { getUser } from "~/middleware/authenticate";
import { newAction } from "./new";
import { proposeBarcodeAction } from "./propose-barcode";
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
		case "propose-barcode": {
			const error = await proposeBarcodeAction({ context, formdata });
			return { error, action };
		}
		default:
			throw new Error(`Invalid action: ${action}`);
	}
}

export type Action = typeof action;
