import { db } from "~/database";

export async function generateBarcodeAction(id: number) {
  const [errMsg, barcode] = await db.product.barcode.gen(id);
  if (errMsg) {
    return {
      error: errMsg,
    };
  }
  return {
    barcode,
  };
}
