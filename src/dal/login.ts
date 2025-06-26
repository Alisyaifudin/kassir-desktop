import { z } from "zod";
import { err, ok, Result } from "~/lib/utils";
import { fetch } from '@tauri-apps/plugin-http';

export async function login(
	url: string,
	name: string,
	password: string
): Promise<Result<"Aplikasi bermasalah" | "Nama dan/atau kata sandi salah", string>> {
	console.log(1);
	try {
		const res = await fetch(url + "/api/session", {
			method: "POST",
			body: JSON.stringify({ name, password }),
		});
		var obj = await res.json();
	} catch (error) {
		console.error(error);
		return err("Aplikasi bermasalah");
	}
	console.log(2);
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
		console.error(parsed.error);
		return err("Aplikasi bermasalah");
	}
	console.log(3);
	if ("token" in parsed.data) {
		return ok(parsed.data.token);
	}
	return err(parsed.data.error);
}
