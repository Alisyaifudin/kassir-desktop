import { getProfile } from "./utils";
import { Store } from "~/lib/store";
import { useCallback } from "react";
import { useFetch } from "~/hooks/useFetch";
import { tryResult } from "~/lib/utils";

export const useProfile = (context: { store: Store }) => {
	const { profile } = context.store;
	const fetch = useCallback(() => tryResult({ run: () => getProfile(profile) }), []);
	const [state] = useFetch(fetch);
	return state;
};
