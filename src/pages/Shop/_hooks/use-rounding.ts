import { useCtx } from "../use-context";

export function useRounding() {
	const { state, setState } = useCtx();
	const rounding = state.rounding;
	const setRounding = (rounding: number) => setState({ ...state, rounding });
	return [rounding, setRounding] as const;
}
