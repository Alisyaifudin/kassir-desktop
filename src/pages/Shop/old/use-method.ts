import { useCtx } from "./use-context";
import { defaultMethod } from "./use-local-state";

export function useMethod() {
	const { state, setState } = useCtx();
	const method = state.methods.find((m) => m.id === state.method.id) ?? defaultMethod;
	const setMethod = (id: number) => {
		const method = state.methods.find((m) => m.id === id) ?? defaultMethod;
		setState({ ...state, method: method ?? defaultMethod });
	};
	return [method, setMethod] as const;
}
