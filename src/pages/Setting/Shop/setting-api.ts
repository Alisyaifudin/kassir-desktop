import { useStore } from "../../../RootLayout";
import { useAsync } from "../../../hooks/useAsync";
import { Store } from "../../../store";

export const useProfile = () => {
	const { profile } = useStore();
	const setting = useAsync(() => getProfile(profile));
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

export async function setProfile(
	profile: Store["profile"],
	setting: Partial<Record<keyof Store["profile"], string>>
) {
	const promises = Object.entries(setting).map(([key, value]) => {
		if (value !== undefined) {
			return profile[key as keyof Store["profile"]].set(value);
		}
	});
	await Promise.all(promises);
}
