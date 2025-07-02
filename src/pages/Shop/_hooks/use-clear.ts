import { emptyState, LocalContext } from "./use-local-state";

export function clear(context: LocalContext) {
	return () => context.setState(emptyState);
}
