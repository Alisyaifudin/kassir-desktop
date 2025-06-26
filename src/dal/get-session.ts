import { err, ok, type Result } from "~/lib/utils";
import { object, z } from "zod";
import { fetch } from '@tauri-apps/plugin-http';

export async function getSession(
	token: string,
	url: string
): Promise<
	Result<
		"Aplikasi bermasalah",
		| { session: { id: number; name: string; role: DB.Role }; token: string }
		| { session: null; token: null }
	>
> {
	const res = await fetch(url + "/api/session", {
		headers: {
			"X-Header-Token": token,
		},
	});
	if (res.status >= 400) {
		return err("Aplikasi bermasalah");
	}
	const obj = await res.json();
	const parsed = z
		.union([
			z.object({
				session: object({
					id: z.number().int(),
					name: z.string(),
					role: z.enum(["admin", "user"]),
				}),
				token: z.string(),
			}),
			z.object({
				session: z.null(),
				token: z.null(),
			}),
		])
		.safeParse(obj);
	if (!parsed.success) {
		return err("Aplikasi bermasalah");
	}
	return ok(parsed.data);
}
