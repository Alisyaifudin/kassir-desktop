import { z } from "zod";
import { err, ok, Result } from "~/lib/utils";
import { fetch } from "@tauri-apps/plugin-http";

export async function uploadAllProduct(
	products: DB.Product[],
	token: string,
	url: string
): Promise<Result<"Aplikasi bermasalah" | "Gagal parse json", string>> {
	try {
		var res = await fetch(url + "/api/product", {
			method: "POST",
			body: JSON.stringify(products),
			headers: {
				"X-Header-Token": token,
			},
		});
	} catch (error) {
		console.error(error);
		return err("Aplikasi bermasalah");
	}
	if (res.status >= 400) {
		console.error(res.statusText);
		return err("Aplikasi bermasalah");
	}
	try {
		var raw = await res.json();
	} catch (error) {
		console.error(error);
		return err("Gagal parse json");
	}
	const parsed = z
		.object({
			token: z.string(),
		})
		.safeParse(raw);
	if (!parsed.success) {
		console.error(parsed.error);
		return err("Aplikasi bermasalah");
	}
	return ok(parsed.data.token);
}
