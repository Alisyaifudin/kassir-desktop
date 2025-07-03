import { Show } from "~/components/Show";
import { Data } from "../../_hooks/use-record";
import { ForEach } from "~/components/ForEach";
import { AdditionalItem } from "./AdditionalItem";
import { memo } from "react";

export const Summary = memo(function ({
	discVal,
	totalAfterAdditional,
	change,
	grandTotal,
	pay,
	rounding,
	totalAfterDiscount,
	totalDiscount,
	totalFromItems,
	additionals,
}: {
	discVal: number;
	totalFromItems: number;
	totalDiscount: number;
	totalAfterDiscount: number;
	totalAfterAdditional: number;
	rounding: number;
	grandTotal: number;
	pay: number;
	change: number;
	additionals: Data["additionals"];
}) {
	return (
		<div className="flex flex-col items-end">
			<Top
				discVal={discVal}
				totalAfterDiscount={totalAfterDiscount}
				totalDiscount={totalDiscount}
				totalFromItems={totalFromItems}
			/>
			<Show when={additionals.length > 0}>
				<ForEach items={additionals}>
					{(additional) => <AdditionalItem additional={additional} />}
				</ForEach>
				<hr className="w-full" />
				<div className="grid grid-cols-[170px_250px]">
					<div></div> <p className="text-end">Rp{totalAfterAdditional.toLocaleString("de-DE")}</p>
				</div>
			</Show>
			<Bottom change={change} grandTotal={grandTotal} pay={pay} rounding={rounding} />
		</div>
	);
});

const Top = memo(function ({
	discVal,
	totalFromItems,
	totalAfterDiscount,
	totalDiscount,
}: {
	discVal: number;
	totalFromItems: number;
	totalDiscount: number;
	totalAfterDiscount: number;
}) {
	return (
		<Show when={discVal > 0}>
			<div className="grid grid-cols-[170px_250px]">
				<p className="text-end">Subtotal:</p>
				<p className="text-end">Rp{totalFromItems.toLocaleString("id-ID")}</p>
			</div>
			<div className="grid grid-cols-[170px_250px]">
				<p className="text-end">Diskon:</p>
				<p className="text-end">Rp{totalDiscount.toLocaleString("id-ID")}</p>
			</div>
			<hr />
			<div className="grid grid-cols-[170px_250px]">
				<div></div> <p className="text-end">Rp{totalAfterDiscount.toLocaleString("de-DE")}</p>
			</div>
		</Show>
	);
});

const Bottom = memo(function ({
	rounding,
	grandTotal,
	pay,
	change,
}: {
	rounding: number;
	grandTotal: number;
	pay: number;
	change: number;
}) {
	return (
		<>
			<Show when={rounding > 0}>
				<div className="grid grid-cols-[170px_250px]">
					<p className="text-end">Pembulatan:</p>
					<p className="text-end">Rp{rounding.toLocaleString("id-ID")}</p>
				</div>
			</Show>
			<div className="grid grid-cols-[170px_250px]">
				<p className="text-end">Total:</p>
				<p className="text-end">Rp{grandTotal.toLocaleString("id-ID")}</p>
			</div>
			<div className="grid grid-cols-[170px_250px]">
				<p className="text-end">Pembayaran:</p>
				<p className="text-end">Rp{pay.toLocaleString("id-ID")}</p>
			</div>
			<div className="grid grid-cols-[170px_250px]">
				<p className="text-end">Kembalian:</p>{" "}
				<p className="text-end">Rp{change.toLocaleString("id-ID")}</p>
			</div>
		</>
	);
});
