import { z } from "zod";
import { err, log, ok, Result } from "~/lib/utils";
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
    log.error(JSON.stringify(error));
    return err("Aplikasi bermasalah");
  }
	if (res.status >= 400) {
		log.error(res.statusText);
		return err("Aplikasi bermasalah");
	}
	try {
    var raw = await res.json();
  } catch (error) {
    log.error(JSON.stringify(error));
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
					stock_back: z.number().int(),
					barcode: z.string().nullable(),
					capital: z.number().min(0),
					note: z.string(),
					updated_at: z.number().int(),
				})
				.array(),
		})
		.safeParse(raw);
	if (!parsed.success) {
		log.error(JSON.stringify(parsed.error));
		return err("Aplikasi bermasalah");
	}
	return ok(parsed.data);
}
