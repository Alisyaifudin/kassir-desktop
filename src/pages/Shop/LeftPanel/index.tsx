import { ItemComponent } from "./Item";
import { AdditionalItem } from "./Additional";
import { useFix } from "~/pages/Shop/use-fix";
import { Tab } from "./Tab";
import { ForEach } from "~/components/ForEach";
import { Show } from "~/components/Show";
import { GrandTotal } from "./GrandTotal";
import { Header } from "./Header";
import { Subtotal } from "./Subtotal";
import { useCustomer } from "~/pages/Shop/use-customer";
import { X } from "lucide-react";
import { Button } from "~/components/ui/button";
import { useCtx } from "~/pages/Shop/use-context";
import { useSize } from "~/hooks/use-size";

const itemH = {
	big: {
		height: "calc(100vh - 400px)",
	},
	small: {
		height: "calc(100vh - 300px)",
	},
};

export function LeftPanel() {
	const [fix] = useFix();
	const summary = useCtx().summary;
	const size = useSize();
	const { grandTotal, totalAfterDiscount } = summary.record;
	const items = summary.items;
	items.reverse();
	const n = items.length;
	const [customer, setCustomer] = useCustomer();
	function resetCustomer() {
		setCustomer({ name: "", phone: "", isNew: false });
	}
	return (
		<div className="border-r flex-1 flex flex-col gap-2">
			<div className="outline flex-1 p-1 flex flex-col gap-1">
				<div>
					<Tab />
					<Header />
				</div>
				<div style={itemH[size]} className="flex flex-col overflow-y-auto min-h-0 h-full">
					<ForEach items={items} extractKey={(item, i) => `${n - i! - 1}-${item.name}`}>
						{(item, i) => <ItemComponent index={n - i - 1} item={item} />}
					</ForEach>
					<Show when={summary.additionals.length > 0}>
						<Subtotal fix={fix} totalAfterDiscount={totalAfterDiscount} />
					</Show>
					<ForEach items={summary.additionals}>
						{(add, i) => <AdditionalItem index={i} additional={add} />}
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
						type="button"
					>
						<X />
					</Button>
				</div>
			</Show>
			<GrandTotal fix={fix} grandTotal={grandTotal} />
		</div>
	);
}
