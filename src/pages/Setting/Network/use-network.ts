import { Store } from "~/lib/store";
import { useAsync } from "~/hooks/useAsync";
import { useAction } from "~/hooks/useAction";
import { err, log, ok, Result, tryResult } from "~/lib/utils";
import { z } from "zod";
import { emitter } from "~/lib/event-emitter";
import { login } from "~/dal/login";

export function useNetwork(store: Store) {
	const state = useAsync(async (): Promise<
		Result<
			"Aplikasi bermasalah",
			{
				url: string;
				name: string;
				password: string;
			}
		>
	> => {
		const [errInfo, info] = await getInfo(store);
		if (errInfo) return err(errInfo);
		return ok(info);
	}, ["fetch-network"]);
	const { action, loading, error, setError } = useAction(
		"",
		async (data: { url: string; name: string; password: string }) => {
			const [errInfo] = await tryResult({
				run: () =>
					Promise.all([
						store.core.set("url", data.url),
						store.core.set("name", data.name),
						store.core.set("password", data.password),
					]),
			});
			if (errInfo) return errInfo;
			const [errMsg, token] = await login(data.url, data.name, data.password);
			if (errMsg) return errMsg;
			store.core.set("token", token);
			return null;
		}
	);
	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		const formData = new FormData(e.currentTarget);
		const parsed = z
			.object({
				url: z.string().catch(""),
				name: z.string().catch(""),
				password: z.string().catch(""),
			})
			.safeParse({
				url: formData.get("url"),
				name: formData.get("name"),
				password: formData.get("password"),
			});
		if (!parsed.success) {
			log.error(JSON.stringify(parsed.error));
			setError("Input bermasalah");
			return;
		}
		const errMsg = await action(parsed.data);
		setError(errMsg);
		if (errMsg === null) {
			emitter.emit("fetch-connect");
		}
	};
	return { state, handleSubmit, error, loading };
}

async function getInfo(
	store: Store
): Promise<
	Result<"Aplikasi bermasalah", { url: string; name: string; password: string; token: string }>
> {
	const [errMsg, network] = await tryResult({
		run: async () =>
			Promise.all([
				store.core.get("url"),
				store.core.get("name"),
				store.core.get("password"),
				store.core.get("token"),
			]),
	});
	if (errMsg) return err(errMsg);
	const parsed = z
		.object({
			url: z.string().catch(""),
			name: z.string().catch(""),
			password: z.string().catch(""),
			token: z.string().catch(""),
		})
		.safeParse({
			url: network[0],
			name: network[1],
			password: network[2],
			token: network[3],
		});
	if (!parsed.success) {
		return ok({ url: "", name: "", password: "", token: "" });
	}
	return ok(parsed.data);
}
