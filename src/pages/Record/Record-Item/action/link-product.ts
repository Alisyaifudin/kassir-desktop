import { z } from "zod";
import { db } from "~/database";
import { integer } from "~/lib/utils";

const schema = z.object({
  recordProductId: integer,
  productId: z.nullable(integer),
});

export async function linkProductAction(formdata: FormData) {
  const parsed = schema.safeParse({
    itemId: formdata.get("record-product-id"),
    productId: formdata.get("product-id"),
  });
  if (!parsed.success) {
    const errs = parsed.error.flatten().fieldErrors;
    return {
      recordProductId: errs.recordProductId?.join("; "),
      productId: errs.productId?.join("; "),
    };
  }
  const { recordProductId, productId } = parsed.data;
  const errMsg = await db.recordProduct.update.productId(recordProductId, productId);
  if (errMsg) {
    return {
      global: errMsg,
    };
  }
  return undefined;
}
