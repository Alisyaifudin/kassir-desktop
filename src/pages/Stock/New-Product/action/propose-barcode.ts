import { db } from "~/database";

export async function proposeBarcodeAction() {
  const [errMsg, barcode] = await db.product.barcode.propose();
  if (errMsg) {
    return {
      error: errMsg,
    };
  }
  return {
    barcode,
  };
}
