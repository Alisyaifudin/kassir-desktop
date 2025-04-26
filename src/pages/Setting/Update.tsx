import { useState } from "react";
import { Button } from "../../components/ui/button";
import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { tryResult } from "../../utils";
import { Loader2 } from "lucide-react";
import { TextError } from "../../components/TextError";

// add toast later
export function Update() {
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const handleClick = async () => {
		setLoading(true);
		const [errMsg, val] = await tryResult({
			run: () => update(),
		});
		console.log(val);
		if (errMsg !== null) {
			setError(errMsg);
			setLoading(false);
			return;
		}
		setError("");
		setLoading(false);
	};
	return (
		<div className="flex flex-col gap-1">
			<Button onClick={handleClick} variant="secondary">
				Update {loading ? <Loader2 className="animate-spin" /> : null}
			</Button>
			{error ? <TextError>{error}</TextError> : null}
		</div>
	);
}

async function update(): Promise<boolean> {
	const update = await check();
	if (update) {
		console.log(`found update ${update.version} from ${update.date} with notes ${update.body}`);
		update
			.downloadAndInstall((event) => {
				let downloaded = 0;
				let contentLength = 0;
				switch (event.event) {
					case "Started":
						contentLength = event.data?.contentLength ?? 0;
						console.log(`started downloading ${event.data.contentLength} bytes`);
						break;
					case "Progress":
						downloaded += event.data.chunkLength;
						console.log(`downloaded ${downloaded} from ${contentLength}`);
						break;
					case "Finished":
						console.log("download finished");
						break;
				}
			})
			.then(() => {
				console.log("update installed");
				relaunch();
			});
		return true;
		// alternatively we could also call update.download() and update.install() separately
	}
	return false;
}
