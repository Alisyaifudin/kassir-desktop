import { Store as StoreTauri } from "@tauri-apps/plugin-store";

function generate<T extends string>(
	store: StoreTauri,
	key: T
): { get: () => Promise<string | undefined>; set: (value: string) => Promise<void> } {
	return {
		get: () => store.get<string>(key),
		set: (value: string) => store.set(key, value),
	};
}

const profiles = ["owner", "address", "footer", "header", "newVersion", "showCashier", "size"] as const;

export function generateStore(store: StoreTauri) {
	const obj = profiles.map((p) => [p, generate(store, p)] as const);
	const profile = Object.fromEntries(obj) as {
		[K in (typeof profiles)[number]]: ReturnType<typeof generate<K>>;
	};
	return { profile, core: store };
}

export type Store = ReturnType<typeof generateStore>;

export type Profile = {
		[K in keyof Store['profile']]: Awaited<ReturnType<Store['profile'][K]["get"]>>;
	}
