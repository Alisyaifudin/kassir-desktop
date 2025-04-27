import { useState } from "react";
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
	const { notify } = useNotification();
	const handleClick = async () => {
		setLoading(true);
		const [errMsg] = await tryResult({
			run: () => update(notify),
		});
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

async function update(notify: (notification: React.ReactNode) => void) {
	const update = await check();
	if (update) {
		// console.log(`found update ${update.version} from ${update.date} with notes ${update.body}`);
		update
			.downloadAndInstall((event) => {
				let downloaded = 0;
				let contentLength = 0;
				switch (event.event) {
					case "Started":
						contentLength = event.data?.contentLength ?? 0;
						notify(
							<>
								<p>
									Mulai mengunduh versi {update.version} {update.date}
								</p>
								{event.data.contentLength !== undefined ? (
									<p>Ukuran {event.data.contentLength / 1e6} MB</p>
								) : (
									""
								)}
							</>
						);
						break;
					case "Progress":
						downloaded += event.data.chunkLength;
						console.log(`downloaded ${downloaded} from ${contentLength}`);
						notify(
							<>
								<p>
									Mulai mengunduh versi {update.version} {update.date}
								</p>
								<p>Progres: {(downloaded / contentLength) * 100}%</p>
							</>
						);
						break;
					case "Finished":
						notify(null);
						break;
				}
			})
			.then(() => {
				relaunch();
			});
		return true;
		// alternatively we could also call update.download() and update.install() separately
	}
	notify(<p>Tidak ada update baru</p>);
	setTimeout(() => notify(null), 1000);
}
