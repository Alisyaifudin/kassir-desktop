import { Store as StoreTauri } from "@tauri-apps/plugin-store";
export const generateStore = (store: StoreTauri) => ({
	owner: {
		get: () => store.get<string>("owner"),
		set: (owner: string) => store.set("owner", owner),
	},
	address: {
		get: () => store.get<string>("address"),
		set: (address: string) => store.set("address", address),
	},
});

export type Store = ReturnType<typeof generateStore>;