import { useCtx } from "../use-context";

export function usePay() {
	const { state, setState } = useCtx();
	const pay = state.pay;
	const setPay = (pay: number) => setState({ ...state, pay });
	return [pay, setPay] as const;
}
