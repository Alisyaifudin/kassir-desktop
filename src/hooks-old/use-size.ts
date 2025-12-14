import { useOutletContext } from "react-router";

export type Size = "big" | "small";

export function useSize(): Size {
	const context = useOutletContext<{ size: string } | null>();
	if (context === null) {
		throw new Error("Outside layout provider");
	}
	const size = context.size;
	if (size !== "big" && size !== "small") {
		return "big";
	}
	return size;
}

export function useSizeSafe(): Size | undefined {
	const context = useOutletContext<{ size: string } | null>();
	if (context === null) {
		return undefined;
	}
	const size = context.size;
	if (size !== "big" && size !== "small") {
		return "big";
	}
	return size;
}
