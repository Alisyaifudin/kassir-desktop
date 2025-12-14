import { BaseDirectory, writeTextFile } from "@tauri-apps/plugin-fs";
import { ActionArgs, tryResult } from "~/lib/utils";
import { LOG_PATH } from "./loader";
import { getUser } from "~/middleware/authenticate";

export async function action({ context }: ActionArgs) {
	const user = await getUser(context);
	if (user.role !== "admin") {
		throw new Error("Unauthorized");
	}
	const [errMsg] = await tryResult({
		run: () => writeTextFile(LOG_PATH, "", { baseDir: BaseDirectory.AppLocalData }),
	});
	return errMsg ?? undefined;
}

export type Action = typeof action;
