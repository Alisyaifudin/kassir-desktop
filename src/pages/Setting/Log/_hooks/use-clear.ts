import { BaseDirectory, writeTextFile } from "@tauri-apps/plugin-fs";
import { useAction } from "~/hooks/useAction";
import { tryResult } from "~/lib/utils";

export function useClear(logPath: string, revalidate: () => void, toast: (v: string) => void) {
	const { action, loading } = useAction("", async () =>
		tryResult({
			run: () => writeTextFile(logPath, "", { baseDir: BaseDirectory.AppLocalData }),
		})
	);
	const handleClear = async () => {
		const [errMsg] = await action();
		if (errMsg === null) {
			revalidate();
		} else {
			toast(errMsg);
		}
	};
	return { handleClear, loading };
}
