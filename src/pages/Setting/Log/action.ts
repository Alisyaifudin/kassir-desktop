import { BaseDirectory, writeTextFile } from "@tauri-apps/plugin-fs";
import {  tryResult } from "~/lib/utils";
import { LOG_PATH } from "./loader";
import { auth } from "~/lib/auth";

export async function action() {
	const user = auth.user()
	if (user.role !== "admin") {
		throw new Error("Unauthorized");
	}
	const [errMsg] = await tryResult({
		run: () => writeTextFile(LOG_PATH, "", { baseDir: BaseDirectory.AppLocalData }),
	});
	return errMsg ?? undefined;
}

export type Action = typeof action;
