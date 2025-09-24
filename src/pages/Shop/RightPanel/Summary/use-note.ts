import { useCtx } from "~/pages/Shop/use-context";

export function useNote() {
	const { state, setState } = useCtx();
	const note = state.note;
	const setNote = (note: string) => setState({ ...state, note });
	return [note, setNote] as const;
}
