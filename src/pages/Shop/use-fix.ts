import { useCtx } from "./use-context";

export function useFix() {
	const { state, setState } = useCtx();
	const fix = state.fix;
	const setFix = (fix: number) => setState({ ...state, fix });
	return [fix, setFix] as const;
}
