import { z } from "zod";
import { err, log, ok, Result } from "~/lib/utils";
import { fetch } from "@tauri-apps/plugin-http";

export async function login(
	url: string,
	name: string,
	password: string
): Promise<
	Result<
		"Aplikasi bermasalah" | "Nama dan/atau kata sandi salah" | "Gagal meghubungi server",
		string
	>
> {
	try {
		const res = await fetch(url + "/api/session", {
			method: "POST",
			body: JSON.stringify({ name, password }),
		});
		var obj = await res.json();
	} catch (error) {
		log.error(JSON.stringify(error));
		return err("Gagal meghubungi server");
	}
	const parsed = z
		.union([
			z.object({
				token: z.string(),
			}),
			z.object({
				error: z.literal("Nama dan/atau kata sandi salah"),
			}),
		])
		.safeParse(obj);
	if (!parsed.success) {
		log.error(JSON.stringify(parsed.error));
		return err("Aplikasi bermasalah");
	}
	if ("token" in parsed.data) {
		return ok(parsed.data.token);
	}
	return err(parsed.data.error);
}
