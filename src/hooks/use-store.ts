import { useOutletContext } from "react-router";
import { Store } from "../lib/store";

export const useStore = () => {
	const context = useOutletContext<{ store: Store }|null>();
	if (context === null) {
		throw new Error("Outside the provider")
	}
	return context.store;
};