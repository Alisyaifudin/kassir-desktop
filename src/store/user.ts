import { store } from "@simplestack/store";
import { useStoreValue } from "@simplestack/store/react";
import { User } from "~/lib/auth";

export const userStore = store<null | User>(null);

export const useStore = () => {
	const v = useStoreValue(userStore);
	if (v === null) throw new Error("user is null");
	return v;
};
