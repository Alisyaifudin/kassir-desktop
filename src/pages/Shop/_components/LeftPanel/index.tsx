import { ItemComponent } from "./Item";
import { AdditionalItem } from "./Additional";
import { Summary } from "../../_utils/generate-record";
import { User } from "~/lib/auth";
import { useFix } from "../../_hooks/use-fix";
import { Tab } from "./Tab";
import { ForEach } from "~/components/ForEach";
import { Show } from "~/components/Show";
import { GrandTotal } from "./GrandTotal";
import { Header } from "./Header";
import { Subtotal } from "./Subtotal";
import { LocalContext } from "../../_hooks/use-local-state";
import { Context } from "../../Shop";

export function LeftPanel({
	mode,
	setMode,
	user,
	summary,
	localContext,
	context,
}: {
	mode: "sell" | "buy";
	setMode: (mode: "sell" | "buy") => void;
	summary: Summary;
	user: User;
	localContext: LocalContext;
	context: Context;
}) {
	const [fix] = useFix(localContext);
	const { grandTotal, totalAfterDiscount } = summary.record;
	return (
		<div className="border-r flex-1 flex flex-col gap-2">
			<div className="outline flex-1 p-1 flex flex-col gap-1 overflow-y-auto">
				<Tab mode={mode} setMode={setMode} user={user} />
				<Header />
				<div className="flex text-3xl flex-col overflow-y-auto">
					<ForEach items={summary.items} extractKey={(item, i) => `${i}-${item.name}`}>
						{(item, i) => (
							<ItemComponent
								index={i}
								mode={mode}
								item={item}
								context={context}
								localContext={localContext}
							/>
						)}
					</ForEach>
					<Show when={summary.additionals.length > 0}>
						<Subtotal fix={fix} totalAfterDiscount={totalAfterDiscount} />
					</Show>
					<ForEach items={summary.additionals}>
						{(add, i) => <AdditionalItem index={i} additional={add} context={localContext} />}
					</ForEach>
				</div>
			</div>
			<GrandTotal fix={fix} grandTotal={grandTotal} />
		</div>
	);
}
