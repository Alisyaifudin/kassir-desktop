import { useCtx } from "./use-context";

export function useMode() {
	const ctx = useCtx();
	const { state, setState } = ctx;
	const mode = state.mode;
	const setMode = (mode: DB.Mode) => setState({ ...state, mode });
	return [mode, setMode] as const;
}
