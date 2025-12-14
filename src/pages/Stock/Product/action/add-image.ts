import { Temporal } from "temporal-polyfill";
import { z } from "zod";
import { image } from "~/lib/image";
import { SubAction } from "~/lib/utils";
import { getContext } from "~/middleware/global";

type Action = SubAction & {
	id: number;
};

const fileSchema = z
	.instanceof(File)
	.refine((file) => file.size > 0, { message: "Ukuran gambar nol" });

export async function addImageAction({ context, formdata, id }: Action) {
	const parsed = fileSchema.safeParse(formdata.get("image"));
	if (!parsed.success) {
		return parsed.error.flatten().formErrors.join("; ");
	}
	const file = parsed.data;
	if (file.size > 10 * 1e6) {
		return "Ukuran maksimum 10 MB";
	}
	const now = Temporal.Now.instant().epochMilliseconds;
	const rawName = file.name.replace(/\s+/g, "-");
	const name = `${now}-${rawName}`;
	const parsedMime = z.enum(["image/jpeg", "image/png"]).safeParse(file.type);
	if (!parsedMime.success) {
		return "Format gambar tidak didukung";
	}
	const mimeType = parsedMime.data;
	const { db } = getContext(context);
	const errMsgs = await Promise.all([image.save(file, name), db.image.add.one(name, mimeType, id)]);
	for (const errMsg of errMsgs) {
		if (errMsg) return errMsg;
	}
	return undefined;
}
