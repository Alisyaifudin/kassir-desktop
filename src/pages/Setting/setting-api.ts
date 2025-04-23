import { Store } from "@tauri-apps/plugin-store";
import { useStore } from "../../Layout";
import { useFetch } from "../../hooks/useFetch";

export const useSetting = () => {
	const s = useStore();
	const setting = useFetch(getSetting(s));
	return setting;
};

export async function getSetting(store: Store) {
	const setting = await Promise.all([store.get<string>("owner"), store.get<string>("address")]);
	return { owner: setting[0], address: setting[1] };
}

export async function setSetting(store: Store, setting: { owner?: string; address?: string }) {
	await Promise.all([store.set("owner", setting.owner), store.set("address", setting.address)]);
}
