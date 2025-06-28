import { BaseDirectory, writeTextFile } from "@tauri-apps/plugin-fs";
import { useAction } from "~/hooks/useAction";
import { tryResult } from "~/lib/utils";
import { FETCH_LOG, LOG_PATH } from "./use-log";
import { emitter } from "~/lib/event-emitter";
import { toast } from "sonner";

export function useClear() {
	const { action, loading } = useAction("", async () =>
		tryResult({
			run: () => writeTextFile(LOG_PATH, "", { baseDir: BaseDirectory.AppLocalData }),
		})
	);
	const handleClear = async () => {
		const [errMsg] = await action();
		if (errMsg === null) {
			emitter.emit(FETCH_LOG);
		} else {
			toast.error(errMsg);
		}
	};
	return { handleClear, loading };
}
