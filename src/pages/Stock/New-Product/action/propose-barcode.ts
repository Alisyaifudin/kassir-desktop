import { SubAction } from "~/lib/utils";
import { getContext } from "~/middleware/global";

export async function proposeBarcodeAction({ context }: SubAction) {
	const { db } = getContext(context);
	const [errMsg, barcode] = await db.product.aux.proposeBarcode();
	if (errMsg) {
		return {
			error: errMsg,
		};
	}
	return {
		barcode,
	};
}
