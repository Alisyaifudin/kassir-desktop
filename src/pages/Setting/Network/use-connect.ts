import { fetch } from "@tauri-apps/plugin-http";
import { useEffect, useState } from "react";
import { z } from "zod";
import { useAction } from "~/hooks/useAction";
import { useAsyncDep } from "~/hooks/useAsyncDep";
import { emitter } from "~/lib/event-emitter";
import { err, ok, Result, safeJSON, tryResult } from "~/lib/utils";
import { Store } from "~/store";

export function useConnection(store: Store, url: string) {
	const [update, setUpdate] = useState(false);
	useEffect(() => {
		const listener = () => setUpdate((prev) => !prev);
		emitter.on("fetch-connection", listener);
		return () => {
			emitter.off("fetch-connection", listener);
		};
	}, []);
	useEffect(() => {
		setUpdate((prev) => !prev);
	}, [url]);
	const state = useAsyncDep(async (): Promise<Result<"Aplikasi bermasalah", string | null>> => {
		if (url === "") return ok(null);
		const [errToken, token] = await tryResult({
			run: async () => {
				const token = await store.core.get("token");
				if (typeof token !== "string") {
					return null;
				}
				return token;
			},
		});
		if (errToken) return err(errToken);
		if (token === null) return ok(null);
		const [errMsg, newToken] = await checkConnection(url, token);
		if (errMsg) return err(errMsg);
		return ok(newToken);
	}, [update]);
	const connect = useConnect(store);
	const disconnect = useDisconnect(store);
	return { state, connect, disconnect };
}

function useConnect(store: Store) {
	const { action, loading, error, setError } = useAction(
		"",
		async ({
			name,
			password,
			url,
		}: {
			name: string;
			password: string;
			url: string;
		}): Promise<
			Result<
				"Aplikasi bermasalah" | "url tidak bisa dihubungi" | "Nama dan/atau kata sandi salah",
				string
			>
		> => {
			try {
				var res = await fetch(url + "/api/session", {
					method: "POST",
					body: JSON.stringify({ name, password }),
				});
			} catch (error) {
				console.error(error);
				return err("url tidak bisa dihubungi");
			}
			if (res.status >= 400) {
				console.error(res.statusText);
				return err("Aplikasi bermasalah");
			}
			const body = await res.text();
			const [errObj, obj] = safeJSON(body);
			if (errObj) {
				return err("Aplikasi bermasalah");
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
				console.error(parsed.error);
				return err("Aplikasi bermasalah");
			}
			if ("error" in parsed.data) {
				return err(parsed.data.error);
			}
			return ok(parsed.data.token);
		}
	);
	const handleConnect = (option: { name: string; password: string; url: string }) => async () => {
		const [errMsg, token] = await action(option);
		setError(errMsg);
		if (errMsg === null) {
			await Promise.all([store.core.set("token", token)]);
		} else {
			await store.core.delete("token");
		}
		emitter.emit("fetch-connection");
	};
	return { handleConnect, loading, error };
}

function useDisconnect(store: Store) {
	const { action, loading, error, setError } = useAction("", async () => {
		return null;
	});
	const handleDisconnect = async () => {
		const errMsg = await action();
		setError(errMsg);
		if (errMsg === null) {
			await store.core.delete("token");
		}
		emitter.emit("fetch-connection");
	};
	return { handleDisconnect, loading, error };
}

async function checkConnection(
	url: string,
	token: string
): Promise<Result<"Aplikasi bermasalah", string | null>> {
	const res = await fetch(url + "/api/session", {
		headers: {
			"X-Header-Token": token,
		},
	});
	if (res.status >= 400) {
		console.error(res.statusText);
		return err("Aplikasi bermasalah");
	}
	const obj = await res.json();
	const parsed = z
		.union([
			z.object({
				session: z.object({
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
		console.error(parsed.error);
		return err("Aplikasi bermasalah");
	}
	const { token: newToken } = parsed.data;
	return ok(newToken);
}
