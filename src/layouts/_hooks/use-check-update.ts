import { useEffect, useState } from "react";
import { check } from "@tauri-apps/plugin-updater";
import { useStore } from "~/hooks/use-store";

export function useCheckUpdate() {
	const store = useStore();
	// check for update on mount every 10 minutes
	const [hasUpdate, setHasUpdate] = useState(false);
	useEffect(() => {
		const interval = setInterval(() => {
			check().then((update) => {
				if (update !== null) {
					store.profile.newVersion.set("true");
					setHasUpdate(true);
				} else {
					store.profile.newVersion.set("false");
				}
			});
		}, 10 * 60 * 1000);
		return () => {
			clearInterval(interval);
		};
	}, []);
	return hasUpdate;
}
