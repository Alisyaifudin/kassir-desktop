import { redirect } from "react-router";
import { ActionArgs, getBackURL, integer } from "~/lib/utils";
import { getUser } from "~/middleware/authenticate";
import { editAction } from "./edit";
import { deleteAction } from "./delete";
import { deleteImageAction } from "./delete-image";
import { addImageAction } from "./add-image";
import { generateBarcodeAction } from "./generate-barcode";
import { swapImageAction } from "./swap-image";

export async function action({ context, request, params }: ActionArgs) {
	const user = await getUser(context);
	if (user.role !== "admin") {
		throw new Error("Unauthorized");
	}
	const parsed = integer.safeParse(params.id);
	if (!parsed.success) {
		throw redirect("/stock");
	}
	const id = parsed.data;
	const search = new URL(request.url).searchParams;
	const backUrl = getBackURL("/stock", search);
	const formdata = await request.formData();
	const action = formdata.get("action");
	switch (action) {
		case "edit": {
			const error = await editAction({ context, formdata, id, backUrl });
			return { error, action };
		}
		case "delete": {
			const error = await deleteAction({ context, formdata, id, backUrl });
			return { error, action };
		}
		case "delete-image": {
			const error = await deleteImageAction({ context, formdata });
			return { error, action };
		}
		case "add-image": {
			const error = await addImageAction({ context, formdata, id });
			return { error, action };
		}
		case "swap-image": {
			const error = await swapImageAction({ context, formdata });
			return { error, action };
		}
		case "generate-barcode": {
			const error = await generateBarcodeAction({ context, formdata, id });
			return { error, action };
		}
		default:
			throw new Error(`Invalid action: ${action}`);
	}
}

export type Action = typeof action;
