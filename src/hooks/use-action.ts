import { useActionData } from "react-router";

// 1. Helper to extract the Union type from the Action Promise
type UnwrapAction<T> = T extends (args: any) => Promise<infer U> ? U : never;

// 2. The Curried Hook
export function useAction<T extends (args: any) => Promise<any>>() {
	// We return a secondary function.
	// Since 'T' is already set, TS can now focus entirely on inferring 'K' here.
	return function <K extends UnwrapAction<T>["action"]>(
		intent: K
	): Extract<UnwrapAction<T>, { action: K }>["error"] | undefined {
		const data = useActionData() as UnwrapAction<T> | undefined;

		// Runtime Guard: Check if data exists and matches the requested intent
		if (data && data.action === intent) {
			// We cast here because TS cannot easily correlate 'K' to 'data'
			// in the implementation body, but the external return signature is correct.
			return (data as Extract<UnwrapAction<T>, { action: K }>).error;
		}

		return undefined;
	};
}
