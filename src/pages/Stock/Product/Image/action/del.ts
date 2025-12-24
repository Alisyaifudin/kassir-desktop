import { db } from "~/database";
import { image } from "~/lib/image";
import { integer } from "~/lib/utils";

export async function deleteImageAction(formdata: FormData) {
  const parsed = integer.safeParse(formdata.get("image-id"));
  if (!parsed.success) {
    return parsed.error.flatten().formErrors.join("; ");
  }
  const imageId = parsed.data;
  const [errImg, name] = await db.image.delById(imageId);
  switch (errImg) {
    case "Aplikasi bermasalah":
      return errImg;
    case "Tidak ditemukan":
      throw new Error(errImg);
  }
  image.del(name); // delete the image in the disk on the background
  return undefined;
}
