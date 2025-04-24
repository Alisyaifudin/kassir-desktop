import { Store as StoreTauri } from "@tauri-apps/plugin-store";
export const generateStore = (store: StoreTauri) => ({
	owner: {
		get: () => store.get<string>("owner"),
		set: (owner: string) => store.set("owner", owner),
	},
	desc: {
		get: () => store.get<string>("desc"),
		set: (desc: string) => store.set("desc", desc),
	},
	address: {
		get: () => store.get<string>("address"),
		set: (address: string) => store.set("address", address),
	},
	ig: {
		get: () => store.get<string>("ig"),
		set: (ig: string) => store.set("ig", ig),
	},
	shopee: {
		get: () => store.get<string>("shopee"),
		set: (shopee: string) => store.set("shopee", shopee),
	},
	// tiktok: {
	// 	get: () => store.get<string>("tiktok"),
	// 	set: (tiktok: string) => store.set("tiktok", tiktok),
	// },
	// wa: {
	// 	get: () => store.get<string>("wa"),
	// 	set: (wa: string) => store.set("wa", wa),
	// },
});

export type Store = ReturnType<typeof generateStore>;
