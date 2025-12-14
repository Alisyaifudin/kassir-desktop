import { RouteObject } from "react-router";
import { integer, LoaderArgs } from "~/lib/utils";
import { getContext } from "~/middleware/global";

export const route: RouteObject = {
	path: "image/:id",
	loader,
};

export async function loader({ context, params }: LoaderArgs) {
	const parsed = integer.safeParse(params.id);
  if (!parsed.success) {
    throw new Error("Invalid id");
  }
  const id = parsed.data;
	const { db } = getContext(context);
	const [errMsg, images] = await db.image.get.byProductId(id);
	if (errMsg) return err(errMsg);
	const promises = [];
	for (const img of images) {
		promises.push(image.load(img.name, img.mime));
	}
	const res = await Promise.all(promises);
	const srcs = [];
	for (const [msg, src] of res) {
		if (msg) return err(msg);
		srcs.push(src);
	}
	return ok(srcs);
}
