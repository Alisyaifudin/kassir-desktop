import { useMemo } from "react";
import { useUser } from "~/hooks/use-user";
import { useLocalState } from "../_hooks/use-local-state";
import { generateRecordSummary } from "../_utils/generate-record";
import { Loader2 } from "lucide-react";
import { LeftPanel } from "./LeftPanel";
import { RightPanel } from "./RightPanel";
import { Context } from "../Shop";
import { useMode } from "../_hooks/use-mode";

export function Sheet({ methods, context }: { methods: DB.Method[]; context: Context }) {
	const [mode, setMode] = useMode();
	const user = useUser();
	const { state, setState, clear } = useLocalState(mode, methods);
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
			mode,
			fix: state.fix,
		});
	}, [state]);
	if (state === null || summary === null) {
		return <Loader2 className="animate-splin" />;
	}
	return (
		<div className="gap-2 p-2 flex grow shrink basis-0">
			<LeftPanel
				mode={mode}
				setMode={setMode}
				summary={summary}
				user={user}
				localContext={{ state, setState, clear }}
				context={context}
			/>
			<RightPanel
				mode={mode}
				context={context}
				localContext={{ state, setState, clear }}
				summary={summary}
			/>
		</div>
	);
}