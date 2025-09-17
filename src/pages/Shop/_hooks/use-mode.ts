import { LocalContext } from "./use-local-state";

export function useMode(context: LocalContext) {
	const { state, setState } = context;
	const mode = state.mode;
	const setMode = (mode: DB.Mode) => setState({ ...state, mode });
	return [mode, setMode] as const;
}