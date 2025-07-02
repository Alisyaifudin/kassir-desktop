import { check } from "@tauri-apps/plugin-updater";
import { useCallback } from "react";
import { Temporal } from "temporal-polyfill";
import { useAction } from "~/hooks/useAction";
import { useFetch } from "~/hooks/useFetch";
import { Store } from "~/lib/store";
import { formatDate, tryResult } from "~/lib/utils";
import { relaunch } from '@tauri-apps/plugin-process';

export function useUpdate(
	update: (notify: (notification: React.ReactNode) => void) => Promise<void>,
	notify: (notification: React.ReactNode) => void,
	toast: (text: string) => void,
	store: Store
) {
	const { profile } = store;
	const fetch = useCallback(
		() =>
			tryResult({
				run: () => profile.newVersion.get(),
			}),
		[]
	);
	const [state] = useFetch(fetch);
	const { action, loading } = useAction("", () => tryResult({ run: () => update(notify) }));
	const handleClick = async () => {
		const [errMsg] = await action();
		if (errMsg !== null) {
			toast(errMsg);
		}
	};
	return { handleClick, loading, state };
}

export async function update(notify: (notification: React.ReactNode) => void) {
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
