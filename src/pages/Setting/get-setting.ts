import { Store } from "@tauri-apps/plugin-store";

export async function getSetting(store: Store) {
	const owner = await store.get<string>("owner");
	return { owner };
}