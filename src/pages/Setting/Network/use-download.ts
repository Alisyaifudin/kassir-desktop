import { fetch } from "@tauri-apps/plugin-http";
import { z } from "zod";
import { useAction } from "~/hooks/useAction";
import { err, ok, Result, safeJSON } from "~/lib/utils";
import { useDB, useStore } from "~/RootLayout";

export function useDownload(token: string, url: string) {
	const db = useDB();
	const store = useStore();
	const { error, loading, setError, action } = useAction("", async () => {
		const [errDown, res] = await downloadAllProduct(token, url);
		if (errDown) return errDown;
		const { token: newToken, products } = res;
		const promises: Promise<"Aplikasi bermasalah" | null>[] = [];
		for (const p of products) {
			promises.push(db.product.upsertServer(p));
		}
		const promRes = await Promise.all(promises);
		for (const errMsg of promRes) {
			if (errMsg) return errMsg;
		}
		store.core.set("token", newToken);
		return null;
	});
	const handleClick = async () => {
		const errMsg = await action();
		setError(errMsg);
	};
	return { error, loading, handleClick };
}

async function downloadAllProduct(
	token: string,
	url: string
): Promise<
	Result<"Aplikasi bermasalah" | "Gagal parse json", { token: string; products: DB.Product[] }>
> {
	const res = await fetch(url + "/api/product/sync", {
		method: "GET",
		headers: {
			"X-Header-Token": token,
		},
	});
	if (res.status >= 400) {
		console.error(res.statusText);
		return err("Aplikasi bermasalah");
	}
	const [errJSON, raw] = safeJSON(await res.text());
	if (errJSON) {
		console.error(errJSON);
		return err(errJSON);
	}
	const parsed = z
		.object({
			token: z.string(),
			products: z
				.object({
					id: z.number().int(),
					name: z.string().min(1),
					price: z.number().min(0),
					stock: z.number().int(),
					barcode: z.string().nullable(),
					capital: z.number().min(0),
					note: z.string(),
				})
				.array(),
		})
		.safeParse(raw);
	if (!parsed.success) {
		console.error(parsed.error);
		return err("Aplikasi bermasalah");
	}
	return ok(parsed.data);
}
