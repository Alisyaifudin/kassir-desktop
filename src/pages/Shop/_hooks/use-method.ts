import { defaultMethod, LocalContext } from "./use-local-state";

export function useMethod(context: LocalContext) {
	const { state, setState } = context;
	const method = state.methods.find((m) => m.id === state.method.id) ?? defaultMethod;
	const setMethod = (id: number) => {
		const method = state.methods.find((m) => m.id === id) ?? defaultMethod;
		setState({ ...state, method: method ?? defaultMethod });
	};
	return [method, setMethod] as const;
}
