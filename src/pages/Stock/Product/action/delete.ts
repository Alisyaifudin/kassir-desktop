import { redirect } from "react-router";
import { db } from "~/database";
import { image } from "~/lib/image";

export async function deleteAction(id: number, backUrl: string) {
  const [errImg, images] = await db.image.get.byProductId(id);
  if (errImg) {
    return errImg;
  }
  const errMsg = await db.product.delById(id);
  if (errMsg) {
    return errMsg;
  }
  for (const img of images) {
    image.del(img.name);
  }
  throw redirect(backUrl);
}
