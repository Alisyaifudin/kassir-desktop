import { BaseDirectory, readTextFile } from "@tauri-apps/plugin-fs";
import { useCallback } from "react";
import { useFetch } from "~/hooks/useFetch";
import { err, ok, Result, tryResult } from "~/lib/utils";

export const FETCH_LOG = "fetch-log";

export function useLog(logPath: string) {
	const fetch = useCallback(() => readLog(logPath), []);
	return useFetch(fetch);
}

async function readLog(logPath: string): Promise<Result<"Aplikasi bermasalah", string[]>> {
	const [errMsg, buf] = await tryResult({
		run: () =>
			readTextFile(logPath, {
				baseDir: BaseDirectory.AppLocalData,
			}),
	});
	if (errMsg) return err(errMsg);
	const text = buf ?? "";
	return ok(text.split("\n").reverse());
}
