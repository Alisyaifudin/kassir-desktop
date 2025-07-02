import { useMemo, useState } from "react";
import { RightPanel } from "./_components/RightPanel";
import { LeftPanel } from "./_components/LeftPanel";
import { useLocalState } from "./_hooks/use-local-state";
import { Loader2 } from "lucide-react";
import { generateRecordSummary } from "./_utils/generate-record";
import { useUser } from "~/hooks/use-user";
import { useFetchMethods } from "../../hooks/use-fetch-methods";
import { Database } from "~/database";
import { Async } from "~/components/Async";

export type Context = {
	db: Database;
	toast: (text: string) => void;
};

export default function Page({ db, toast }: Context) {
	const [state] = useFetchMethods(db);
	return (
		<Async state={state}>
			{(methods) => <Wrapper methods={methods} context={{ db, toast }} />}
		</Async>
	);
}

export function Wrapper({ methods, context }: { methods: DB.Method[]; context: Context }) {
	const [mode, setMode] = useState<"sell" | "buy">("sell");
	const user = useUser();
	const { state, setState } = useLocalState(mode, methods);
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
		});
	}, [state]);
	if (state === null || summary === null) {
		return <Loader2 className="animate-splin" />;
	}
	return (
		<main className="gap-2 p-2 flex min-h-0 grow shrink basis-0">
			<LeftPanel
				mode={mode}
				setMode={setMode}
				summary={summary}
				user={user}
				localContext={{ state, setState }}
				context={context}
			/>
			<RightPanel
				mode={mode}
				context={context}
				localContext={{ state, setState }}
				summary={summary}
			/>
		</main>
	);
}
