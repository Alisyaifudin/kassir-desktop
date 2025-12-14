import { SubAction } from "~/lib/utils";
import { getContext } from "~/middleware/global";

type Action = SubAction & {
	id: number;
};

export async function generateBarcodeAction({ context, id }: Action) {
	const { db } = getContext(context);
	const [errMsg, barcode] = await db.product.aux.generateBarcode(id);
	if (errMsg) {
		return {
			error: errMsg,
		};
	}
	return {
		barcode: barcode,
	};
}
