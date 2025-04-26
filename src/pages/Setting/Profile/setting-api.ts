import { useStore } from "../../../Layout";
import { useFetch } from "../../../hooks/useFetch";
import { Store } from "../../../store";

export const useProfile = () => {
	const store = useStore();
	const setting = useFetch(getProfile(store), []);
	return setting;
};

export async function getProfile<S extends Record<string, { get: () => Promise<any> }>>(
	store: S
): Promise<{
	[K in keyof S]: Awaited<ReturnType<S[K]["get"]>>;
}> {
	const entries = await Promise.all(
		(Object.keys(store) as Array<keyof S>).map(async (key) => {
			const value = await store[key].get();
			return [key, value] as const;
		})
	);

	return Object.fromEntries(entries) as {
		[K in keyof S]: Awaited<ReturnType<S[K]["get"]>>;
	};
}

export async function setProfile(store: Store, setting: Partial<Record<keyof Store, string>>) {
	const promises = Object.entries(setting).map(([key, value]) => {
		if (value !== undefined) {
			return store[key as keyof Store].set(value);
		}
	});
	await Promise.all(promises);
}
