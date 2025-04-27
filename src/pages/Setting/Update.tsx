import { useEffect, useState } from "react";
import { Button } from "../../components/ui/button";
import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { tryResult } from "../../utils";
import { Loader2 } from "lucide-react";
import { TextError } from "../../components/TextError";
import { useNotification } from "../../components/Notification";

// add toast later
export function Update() {
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const [status, setStatus] = useState<"Started" | "Progress" | "Finished" | "">("");
	const { notify } = useNotification();
	const handleClick = async () => {
		setLoading(true);
		const [errMsg, val] = await tryResult({
			run: () => update(setStatus),
		});
		if (errMsg !== null) {
			setError(errMsg);
			setLoading(false);
			return;
		}
		if (val) {
			notify(
				<div className="flex items-center gap-2">
					<p>Mengunduh update</p>
					<Loader2 className="animate-spin" />
				</div>
			);
		}
		setError("");
		setLoading(false);
	};
	useEffect(() => {
		if (status === "Finished") {
			notify(null);
		}
	}, [status]);
	return (
		<div className="flex flex-col gap-1">
			<Button onClick={handleClick} variant="secondary">
				Update {loading ? <Loader2 className="animate-spin" /> : null}
			</Button>
			{error ? <TextError>{error}</TextError> : null}
		</div>
	);
}

async function update(
	setStatus: React.Dispatch<React.SetStateAction<"Started" | "Progress" | "Finished" | "">>
): Promise<boolean> {
	const update = await check();
	if (update) {
		console.log(`found update ${update.version} from ${update.date} with notes ${update.body}`);
		update
			.downloadAndInstall((event) => {
				setStatus(event.event);
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
