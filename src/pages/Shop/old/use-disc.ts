import { useCtx } from "./use-context";

export function useDisc() {
	const { state, setState } = useCtx();
	const discKind = state.discKind;
	const discVal = state.discVal;
	const disc = { kind: discKind, value: discVal };
	const setDisc = {
		kind: (kind: DB.ValueKind) => {
			let value = discVal;
			if (kind === "percent" && value > 100) {
				value = 100;
			}
			setState({ ...state, discKind: kind, discVal: value });
		},
		value: (value: number) => {
			let val = value;
			if (value < 0) {
				val = 0;
			}
			if (discKind === "percent" && value > 100) {
				val = 100;
			}
			setState({ ...state, discVal: val });
		},
	};
	return [disc, setDisc] as const;
}
