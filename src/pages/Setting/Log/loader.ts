import { BaseDirectory, readTextFile } from "@tauri-apps/plugin-fs";
import { data } from "react-router";
import { err, ok, Result, tryResult } from "~/lib/utils";

export const LOG_PATH = "logs/kassir.log";

export async function loader() {
	const text = readLog(LOG_PATH);
	return data(text);
}

export type Loader = typeof loader;

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
