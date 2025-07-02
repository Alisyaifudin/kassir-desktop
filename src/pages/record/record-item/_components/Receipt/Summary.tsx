import { Summary } from "~/lib/record";
import { AdditionalItem } from "./AdditionalItem";
import { ForEach } from "~/components/ForEach";
import { Show } from "~/components/Show";
import { METHOD_NAMES } from "~/lib/utils";

export function SummaryBody({
	record,
	itemsLength,
	additionals,
	method,
}: {
	record: Summary["record"];
	itemsLength: number;
	additionals: Summary["additionals"];
	method: DB.Method;
}) {
	return (
		<div className="flex justify-end">
			<div className="flex flex-col items-end">
				<Show when={record.disc_val > 0 && itemsLength > 0}>
					<div className="grid grid-cols-[100px_100px]">
						<p>Subtotal</p>{" "}
						<p className="text-end">Rp{record.totalFromItems.toLocaleString("id-ID")}</p>
					</div>
					<div className="grid grid-cols-[100px_100px]">
						<p>Diskon</p>{" "}
						<p className="text-end">
							Rp
							{record.totalDiscount.toLocaleString("id-ID")}
						</p>
					</div>
					<hr className="w-full" />
				</Show>
				<Show when={additionals.length > 0}>
					<Show when={itemsLength === 0}>
						<div className="grid grid-cols-[100px_100px]">
							<p></p>{" "}
							<p className="text-end">Rp{record.totalAfterDiscount.toLocaleString("id-ID")}</p>
						</div>
					</Show>
					<ForEach items={additionals}>
						{(additional) => <AdditionalItem additional={additional} />}
					</ForEach>
					<hr className="w-full" />
				</Show>
				<Show when={record.rounding !== 0}>
					<div className="grid grid-cols-[100px_100px]">
						<p></p>
						<p className="text-end">Rp{record.totalAfterAdditional.toLocaleString("id-ID")}</p>
					</div>
					<div className="grid grid-cols-[100px_100px]">
						<p>Pembulatan</p>
						<p className="text-end">Rp{record.rounding.toLocaleString("id-ID")}</p>
					</div>
				</Show>
				<div className="grid grid-cols-[100px_100px]">
					<p>Total</p> <p className="text-end">Rp{record.grandTotal.toLocaleString("id-ID")}</p>
				</div>
				<div className="grid grid-cols-[1fr_100px_100px]">
					<p className="pr-5">
						({METHOD_NAMES[method.method]}
						{method.name === null ? null : " " + method.name})
					</p>
					<p>Pembayaran</p>
					<p className="text-end">Rp{record.pay.toLocaleString("id-ID")}</p>
				</div>
				<hr className="w-full" />
				<div className="grid grid-cols-[100px_100px]">
					<p>Kembalian</p> <p className="text-end">Rp{record.change.toLocaleString("id-ID")}</p>
				</div>
			</div>
		</div>
	);
}
