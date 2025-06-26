import { z } from "zod";
import { err, ok, Result } from "~/lib/utils";
import { fetch } from '@tauri-apps/plugin-http';

export async function downloadAllProduct(
	token: string,
	url: string
): Promise<
	Result<"Aplikasi bermasalah" | "Gagal parse json", { token: string; products: DB.Product[] }>
> {
	try {
		var res = await fetch(url + "/api/product/sync", {
			method: "GET",
			headers: {
				"X-Header-Token": token,
			},
		});
	} catch (error) {
    console.error(error)
    return err("Aplikasi bermasalah");
  }
	if (res.status >= 400) {
		console.error(res.statusText);
		return err("Aplikasi bermasalah");
	}
	try {
    var raw = await res.json();
  } catch (error) {
    console.error(error)
    return err("Gagal parse json");
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
