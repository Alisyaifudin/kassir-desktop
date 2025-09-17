import { useMemo } from "react";
import { useUser } from "~/hooks/use-user";
import { type LocalContext } from "../_hooks/use-local-state";
import { generateRecordSummary } from "../_utils/generate-record";
import { Loader2 } from "lucide-react";
import { LeftPanel } from "./LeftPanel";
import { RightPanel } from "./RightPanel";
import { Context } from "../Shop";

export function Sheet({ context, localContext }: { localContext: LocalContext; context: Context }) {
	const user = useUser();
	const { state, setState, clear } = localContext;
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
	if (summary === null) {
		return <Loader2 className="animate-splin" />;
	}
	return (
		<div className="gap-2 p-2 flex grow shrink basis-0">
			<LeftPanel
				summary={summary}
				user={user}
				localContext={{ state, setState, clear }}
				context={context}
			/>
			<RightPanel context={context} localContext={{ state, setState, clear }} summary={summary} />
		</div>
	);
}
