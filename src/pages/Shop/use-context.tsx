import { createContext, useContext, useMemo } from "react";
import { SetState, useLocalState } from "./use-local-state";
import { useUser } from "~/hooks/use-user";
import { State } from "~/pages/Shop/util-schema";
import { generateRecordSummary, Summary } from "~/pages/Shop/util-generate-record";

export type Context = {
	methods: DB.Method[];
	state: State;
	setState: SetState;
	summary: Summary;
	clear: (del?: boolean) => void;
	toast: (text: string) => void;
};

export const context = createContext<Context | null>(null);
const ContextProvider = context.Provider;

export function Provider({
	children,
	methods,
	toast,
}: {
	children: React.ReactNode;
	methods: DB.Method[];
	toast: (text: string) => void;
}) {
	const user = useUser();
	const [state, setState, clear] = useLocalState(methods);
	const summary = useMemo(() => {
		if (state === null) return null;
		return generateRecordSummary({
			record: {
				cashier: user.name,
				discKind: state.discKind,
				discVal: state.discVal,
				method: state.method,
				note: state.note,
				pay: state.pay,
				rounding: state.rounding,
			},
			additionals: state.additionals,
			items: state.items,
			mode: state.mode,
			fix: state.fix,
		});
	}, [state]);
	if (state === null || summary === null) {
		return <ContextProvider value={null}>{children}</ContextProvider>;
	}
	return (
		<ContextProvider value={{ methods, state, setState, clear, toast, summary }}>
			{children}
		</ContextProvider>
	);
}

export function useCtx(): Context {
	const ctx = useContext(context);
	if (ctx === null) {
		throw new Error("Outside the context provider");
	}
	return ctx;
}
