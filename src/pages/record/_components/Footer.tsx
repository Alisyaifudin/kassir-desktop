import { ForEach } from "~/components/ForEach";
import { Show } from "~/components/Show";
import { AdditionalTransfrom, RecordTransform } from "~/lib/record";
import { Additional } from "./Additonal";
import { METHOD_NAMES } from "~/lib/utils";

export function Footer({
	method,
	record,
	additionals,
}: {
	method: DB.Method;
	record: RecordTransform;
	additionals: AdditionalTransfrom[];
}) {
	return (
		<div className="flex flex-col items-end">
			<Show when={record.disc_val > 0}>
				<div className="grid grid-cols-[170px_200px]">
					<p className="text-end">Subtotal:</p>
					<p className="text-end">Rp{record.totalFromItems.toLocaleString("id-ID")}</p>
				</div>
				<div className="grid grid-cols-[170px_200px]">
					<p className="text-end">Diskon:</p>
					<p className="text-end">Rp{record.totalDiscount.toLocaleString("id-ID")}</p>
				</div>
				<hr />
				<div className="grid grid-cols-[170px_200px]">
					<div></div>{" "}
					<p className="text-end">Rp{record.totalAfterDiscount.toLocaleString("de-DE")}</p>
				</div>
			</Show>
			<Show when={additionals.length > 0}>
				<ForEach items={additionals}>
					{(additional) => <Additional additional={additional} />}
				</ForEach>
				<hr className="w-full" />
				<div className="grid grid-cols-[170px_200px]">
					<div></div>{" "}
					<p className="text-end">Rp{record.totalAfterAdditional.toLocaleString("de-DE")}</p>
				</div>
			</Show>
			<Show when={record.rounding > 0}>
				<div className="grid grid-cols-[170px_200px]">
					<p className="text-end">Pembulatan:</p>
					<p className="text-end">Rp{record.rounding.toLocaleString("id-ID")}</p>
				</div>
			</Show>
			<div className="grid grid-cols-[170px_200px]">
				<p className="text-end">Total:</p>
				<p className="text-end">Rp{record.grandTotal.toLocaleString("id-ID")}</p>
			</div>
			<div className="grid grid-cols-[1fr_170px_200px]">
				<p className="pr-5">
					({METHOD_NAMES[method.method]}
					{method.name === null ? null : " " + method.name})
				</p>
				<p className="text-end">Pembayaran:</p>
				<p className="text-end">Rp{record.pay.toLocaleString("id-ID")}</p>
			</div>
			<div className="grid grid-cols-[170px_200px]">
				<p className="text-end">Kembalian:</p>{" "}
				<p className="text-end">Rp{record.change.toLocaleString("id-ID")}</p>
			</div>
		</div>
	);
}
