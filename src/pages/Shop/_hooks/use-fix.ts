import type { LocalContext } from "./use-local-state";

export function useFix(context: LocalContext) {
	const { state, setState } = context;
	const fix = state.fix;
	const setFix = (fix: number) => setState({ ...state, fix });
	return [fix, setFix] as const;
}
