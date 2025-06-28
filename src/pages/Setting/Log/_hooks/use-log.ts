import { BaseDirectory, readTextFile } from "@tauri-apps/plugin-fs";
import { useAsync } from "~/hooks/useAsync";
import { err, ok, Result, tryResult } from "~/lib/utils";

export const FETCH_LOG = "fetch-log";
export const LOG_PATH = "logs/kassir.log";

export function useLog() {
	const state = useAsync(() => readLog(), [FETCH_LOG]);
	return state;
}

async function readLog(): Promise<Result<"Aplikasi bermasalah", string[]>> {
	const [errMsg, buf] = await tryResult({
		run: () =>
			readTextFile(LOG_PATH, {
				baseDir: BaseDirectory.AppLocalData,
			}),
	});
	if (errMsg) return err(errMsg);
	const text = buf ?? "";
	return ok(text.split("\n").reverse());
}