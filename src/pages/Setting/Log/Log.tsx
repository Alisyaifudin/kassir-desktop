import { readTextFile, BaseDirectory, writeTextFile } from "@tauri-apps/plugin-fs";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Await } from "~/components/Await";
import { Button } from "~/components/ui/button";
import { useAction } from "~/hooks/useAction";
import { useAsync } from "~/hooks/useAsync";
import { emitter } from "~/lib/event-emitter";
import { err, ok, Result, tryResult } from "~/lib/utils";

export default function Page() {
	const state = useLog();
	const { loading, handleDelete } = useDelete();
	return (
		<div className="flex flex-col gap-2 p-5 flex-1 text-3xl overflow-hidden">
			<div className="flex justify-between items-center">
				<h1 className="text-4xl font-bold">Log</h1>
				<Button variant="destructive" onClick={handleDelete}>
					{loading ? <Loader2 className="animate-spin" /> : null}
					Bersihkan
				</Button>
			</div>
			<div className="flex flex-col gap-1 bg-black h-full overflow-auto">
				<Await state={state}>
					{(data) =>
						data.map((t, i) => (
							<p className="text-xl text-white" key={i}>
								{t}
							</p>
						))
					}
				</Await>
			</div>
		</div>
	);
}

function useLog() {
	const state = useAsync(() => readLog(), ["fetch-log"]);
	return state;
}

async function readLog(): Promise<Result<"Aplikasi bermasalah", string[]>> {
	const [errMsg, buf] = await tryResult({
		run: () =>
			readTextFile("logs/kassir.log", {
				baseDir: BaseDirectory.AppLocalData,
			}),
	});
	if (errMsg) return err(errMsg);
	const text = buf ?? "";
	return ok(text.split("\n").reverse());
}

function useDelete() {
	const { action, loading } = useAction("", async () =>
		tryResult({
			run: () => writeTextFile("logs/kassir.log", "", { baseDir: BaseDirectory.AppLocalData }),
		})
	);
	const handleDelete = async () => {
		const [errMsg] = await action();
		if (errMsg === null) {
			emitter.emit("fetch-log");
		} else {
			toast.error(errMsg);
		}
	};
	return { handleDelete, loading };
}
