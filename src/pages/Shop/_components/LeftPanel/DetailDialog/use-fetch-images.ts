import { useCallback } from "react";
import { useDB } from "~/hooks/use-db";
import { useFetch } from "~/hooks/useFetch";
import { err, ok, Result } from "~/lib/utils";
import { image } from "~/lib/image";

export function useFetchImages(id: number, ) {
  const db = useDB();
	const fetch = useCallback(async (): Promise<Result<"Aplikasi bermasalah", string[]>> => {
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
	}, []);
	const [state] = useFetch(fetch);
	return state;
}