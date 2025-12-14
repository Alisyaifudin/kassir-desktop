import { Store as StoreTauri } from "@tauri-apps/plugin-store";

// function generate<T extends string>(
// 	store: StoreTauri,
// 	key: T
// ): { get: () => Promise<string | undefined>; set: (value: string) => Promise<void> } {
// 	return {
// 		get: () => store.get<string>(key),
// 		set: (value: string) => store.set(key, value),
// 	};
// }

const configurations = [
	"owner",
	"address",
	"footer",
	"header",
	"newVersion",
	"showCashier",
	"size",
] as const;

export function generateStore(store: StoreTauri) {
	// const obj = profiles.map((p) => [p, generate(store, p)] as const);
	// const profile = Object.fromEntries(obj) as {
	// 	[K in (typeof profiles)[number]]: ReturnType<typeof generate<K>>;
	// };
	async function get() {
		const promises: Promise<unknown>[] = [];
		for (const key of configurations) {
			promises.push(store.get(key));
		}
		const res = await Promise.all(promises);
		const r = res.map((p, i) => [configurations[i], p] as const);
		return Object.fromEntries(r) as {
			[K in (typeof configurations)[number]]: string;
		};
	}
	async function set(val: Record<string, string>) {
		let promises: Promise<void>[] = [];
		for (const [k, v] of Object.entries(val)) {
			promises.push(store.set(k, v));
		}
		return Promise.all(promises);
	}
	async function size(): Promise<Size> {
		const r = await store.get("size");
		if (r !== "big" && r !== "small") {
			return "big";
		}
		return r;
	}
	return { get, set, core: store, size };
}

export type Store = ReturnType<typeof generateStore>;

// export type Profile = {
// 	[K in keyof Store["profile"]]: Awaited<ReturnType<Store["profile"][K]["get"]>>;
// };

export type Size = "big" | "small";

export type Config = {
	size: Size;
	showCashier: boolean;
	owner: string;
	address: string;
	footer: string;
	header: string;
	newVersion: string;
};

export function getSize(size: string): Size {
	switch (size) {
		case "small":
		case "big":
			return size;
		default:
			return "big";
	}
}