import { useCtx } from "./use-context";

export function useCustomer() {
	const { state, setState } = useCtx();
	const customer = state.customer;
	const setCustomer = (customer: { name: string; phone: string; isNew: boolean }) =>
		setState({ ...state, customer });
	return [customer, setCustomer] as const;
}
