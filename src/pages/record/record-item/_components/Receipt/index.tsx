import { ReceiptItem } from "./ReceiptItem";
import { Profile } from "~/lib/store";
import { Data } from "../../_hooks/use-record";
import Redirect from "~/components/Redirect";
import { usePrint } from "../../_hooks/use-print";
import { Top } from "./Top";
import { Header } from "./Header";
import { Show } from "~/components/Show";
import { ForEach } from "~/components/ForEach";
import { SummaryBody } from "./Summary";
import { Footer } from "./Footer";

export function Receipt({
	data: { additionals, items, method, record },
	profile,
	socials,
}: {
	data: Data;
	profile: Profile;
	socials: DB.Social[];
}) {
	const { print, ref } = usePrint();
	if (items.length === 0 && additionals.length === 0) {
		return <Redirect to="/records" />;
	}
	const headers = profile.header === undefined ? [] : profile.header.split("\n");
	const footers = profile.footer === undefined ? [] : profile.footer.split("\n");
	const totalQty = items.map((i) => i.qty).reduce((p, c) => c + p);
	const totalProductTypes = items.length;
	return (
		<div className="flex flex-col gap-5 w-full max-w-[400px] mx-auto">
			<Top buttonRef={ref} print={print} mode={record.mode} credit={record.credit} />
			<div className="border pt-5">
				<div id="print-container" className="flex flex-col gap-2 overflow-auto px-2">
					<Header
						address={profile.address ?? ""}
						cashier={record.cashier}
						headers={headers}
						owner={profile.owner ?? ""}
						showCashier={profile.showCashier ?? ""}
						timestamp={record.timestamp}
					/>
					<hr />
					<Show when={items.length > 0}>
						<ForEach items={items}>{(item) => <ReceiptItem {...item} />}</ForEach>
						<hr />
					</Show>
					<SummaryBody additionals={additionals} itemsLength={items.length} record={record} />
					<Footer
						totalProductTypes={totalProductTypes}
						totalQty={totalQty}
						footers={footers}
						socials={socials}
						method={method}
						customer={{name: record.customer_name, phone: record.customer_phone}}
					/>
				</div>
			</div>
		</div>
	);
}
