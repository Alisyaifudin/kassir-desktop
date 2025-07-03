import { ForEach } from "~/components/ForEach";
import { Discount } from "../../../_components/Discount";
import { Data } from "../../_hooks/use-record";

type Props = Data["items"][number];

export function ReceiptItem({ name, price, qty, discs, total }: Props) {
	return (
		<div className="flex flex-col">
			<p className="text-wrap">{name}</p>
			<div className="flex justify-between">
				<div className="flex gap-1">
					<p>{price.toLocaleString("id-ID")}</p>
					&#215;
					<p>{qty}</p>
				</div>
				<p>{total.toLocaleString("id-ID")}</p>
			</div>
			<ForEach items={discs}>
				{(disc) => (
					<div className="flex justify-between">
						<Discount type={disc.kind} value={disc.value} />
						<p>({disc.effVal.toLocaleString("id-ID")})</p>
					</div>
				)}
			</ForEach>
		</div>
	);
}
