import { useStore } from "../../Layout";
import { useFetch } from "../../hooks/useFetch";
import { Store } from "../../store";

export const useSetting = () => {
	const store = useStore();
	const setting = useFetch(getSetting(store));
	return setting;
};

export async function getSetting(store: Store) {
	const setting = await Promise.all([store.owner.get(), store.address.get()]);
	return { owner: setting[0], address: setting[1] };
}

export async function setSetting(store: Store, setting: Partial<Record<keyof Store, string>>) {
	const promises = Object.entries(setting).map(([key, value]) => {
		if (value) {
			return store[key as keyof Store].set(value);
		}
	});
	await Promise.all(promises);
}
