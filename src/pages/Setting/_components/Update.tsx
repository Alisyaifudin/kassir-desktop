import { useState } from "react";
import { Button } from "~/components/ui/button";
import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { formatDate, tryResult } from "~/lib/utils";
import { BellRing, Loader2 } from "lucide-react";
import { TextError } from "~/components/TextError";
import { useNotification } from "~/components/Notification";
import { Temporal } from "temporal-polyfill";
import { useStore } from "~/RootLayout";
import { useAsync } from "~/hooks/useAsync";
import { AwaitDangerous } from "~/components/Await";

export function Update() {
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const { notify } = useNotification();
	const { profile } = useStore();
	const state = useAsync(() => profile.newVersion.get());
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
			<AwaitDangerous
				state={state}
				Loading={
					<Button onClick={handleClick} variant="secondary">
						Update {loading ? <Loader2 className="animate-spin" /> : null}{" "}
					</Button>
				}
			>
				{(data) => (
					<>
						<Button onClick={handleClick} variant="secondary">
							Update {loading ? <Loader2 className="animate-spin" /> : null}
							{data === "true" ? <BellRing className="text-red-500 animate-ring" /> : null}
						</Button>
						{data === "true" ? <p className="text-2xl">Ada versi baru!</p> : null}
					</>
				)}
			</AwaitDangerous>
			{error ? <TextError>{error}</TextError> : null}
		</div>
	);
}

async function update(notify: (notification: React.ReactNode) => void) {
	const update = await check();
	if (update) {
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
						const time = update.date ? Temporal.ZonedDateTime.from(update.date) : null;
						notify(
							<>
								<p>
									Mulai mengunduh versi {update.version}{" "}
									{time ? formatDate(time.epochMilliseconds) : ""}
								</p>
								<p>
									Progres: {downloaded / 1e3}/{contentLength > 0 ? contentLength / 1e3 : "?"}{" "}
									{contentLength > 0 ? `(${(downloaded / contentLength) * 100}%)` : ""}
								</p>
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
		return;
		// alternatively we could also call update.download() and update.install() separately
	}
	notify(<p>Tidak ada update baru</p>);
	setTimeout(() => notify(null), 3000);
}
