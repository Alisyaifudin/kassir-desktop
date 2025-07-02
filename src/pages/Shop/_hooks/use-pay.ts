import { LocalContext } from "./use-local-state";

export function usePay(context: LocalContext) {
	const { state, setState } = context;
	const pay = state.pay;
	const setPay = (pay: number) => setState({ ...state, pay });
	return [pay, setPay] as const;
}
