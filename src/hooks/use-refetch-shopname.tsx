import { useOutletContext } from "react-router";

export function useRefetchShopname() {
	const context = useOutletContext<{ refetchName: () => void } | null>();
	if (context === null) {
		throw new Error("Outside layout provider");
	}
	return context.refetchName;
}
