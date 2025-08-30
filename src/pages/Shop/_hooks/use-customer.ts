import { LocalContext } from "./use-local-state";

export function useCustomer(context: LocalContext) {
	const { state, setState } = context;
	const customer = state.customer;
	const setCustomer = (customer: { name: string; phone: string; isNew: boolean }) =>
		setState({ ...state, customer });
	return [customer, setCustomer] as const;
}
