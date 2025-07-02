import { LocalContext } from "./use-local-state";

export function useNote(context: LocalContext) {
	const { state, setState } = context;
	const note = state.note;
	const setNote = (note: string) => setState({ ...state, note });
	return [note, setNote] as const;
}
