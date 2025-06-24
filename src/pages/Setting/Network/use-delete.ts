import { fetch } from "@tauri-apps/plugin-http";
import { z } from "zod";
import { useAction } from "~/hooks/useAction";
import { err, ok, Result, safeJSON } from "~/lib/utils";
import { useStore } from "~/RootLayout";

export function useDelete(token: string, url: string) {
	const store = useStore();
	const { error, loading, setError, action } = useAction("", async () => {
		const [errMsg, newToken] = await deleteAllProduct(token, url);
		if (errMsg) return errMsg;
		store.core.set("token", newToken);
		return null;
	});
	const handleClick = async () => {
		const errMsg = await action();
		setError(errMsg);
	};
	return { error, loading, handleClick };
}

async function deleteAllProduct(
	token: string,
	url: string
): Promise<Result<"Aplikasi bermasalah" | "Gagal parse json", string>> {
	const res = await fetch(url + "/api/product", {
		method: "DELETE",
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
		})
		.safeParse(raw);
	if (!parsed.success) {
		console.error(parsed.error);
		return err("Aplikasi bermasalah");
	}
	return ok(parsed.data.token);
}
