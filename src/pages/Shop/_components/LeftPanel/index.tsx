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
import { useCustomer } from "../../_hooks/use-customer";
import { X } from "lucide-react";
import { Button } from "~/components/ui/button";
import { useMode } from "../../_hooks/use-mode";

export function LeftPanel({
	user,
	summary,
	localContext,
	context,
}: {
	summary: Summary;
	user: User;
	localContext: LocalContext;
	context: Context;
}) {
	const [fix] = useFix(localContext);
	const [mode, setMode] = useMode(localContext);
	const { grandTotal, totalAfterDiscount } = summary.record;
	const items = summary.items;
	items.reverse();
	const n = items.length;
	const [customer, setCustomer] = useCustomer(localContext);
	function resetCustomer() {
		setCustomer({ name: "", phone: "", isNew: false });
	}
	return (
		<div className="border-r flex-1 flex flex-col gap-2">
			<div className="outline flex-1 p-1 flex flex-col gap-1">
				<Tab mode={mode} setMode={setMode} user={user} />
				<Header />
				<div className="flex text-3xl flex-col overflow-y-auto min-h-0 h-full max-h-[calc(100vh-400px)]">
					<ForEach items={items} extractKey={(item, i) => `${n - i! - 1}-${item.name}`}>
						{(item, i) => (
							<ItemComponent
								index={n - i - 1}
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
			<Show when={customer.name.trim() !== "" && customer.phone.trim() !== ""}>
				<div className="flex items-center gap-2">
					<p className="text-3xl">Pelanggan: {customer.name}</p>
					<Button
						variant="destructive"
						size="icon"
						className="rounded-full"
						onClick={resetCustomer}
					>
						<X />
					</Button>
				</div>
			</Show>
			<GrandTotal fix={fix} grandTotal={grandTotal} />
		</div>
	);
}
