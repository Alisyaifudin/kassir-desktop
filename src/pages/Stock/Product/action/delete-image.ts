import { image } from "~/lib/image";
import { integer, SubAction } from "~/lib/utils";
import { getContext } from "~/middleware/global";

export async function deleteImageAction({ context, formdata }: SubAction) {
	const parsed = integer.safeParse(formdata.get("image-id"));
	if (!parsed.success) {
		return parsed.error.flatten().formErrors.join("; ");
	}
	const imageId = parsed.data;
	const { db } = getContext(context);
	const [errImg, name] = await db.image.del.byId(imageId);
	switch (errImg) {
		case "Aplikasi bermasalah":
			return errImg;
		case "Gambar tidak ada":
			throw new Error(errImg);
	}
	image.del(name); // delete the image in disk on the background
	return undefined;
}
