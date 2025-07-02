import { LocalContext } from "./use-local-state";

export function useRounding(context: LocalContext) {
	const { state, setState } = context;
	const rounding = state.rounding;
	const setRounding = (rounding: number) => setState({ ...state, rounding });
	return [rounding, setRounding] as const;
}
