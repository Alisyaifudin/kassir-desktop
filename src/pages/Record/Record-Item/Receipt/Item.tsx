import { ForEach } from "~/components/ForEach";
import { Summary } from "~/lib/record";
import { Discount } from "./Discount";

type Props = Summary["items"][number];

export function Item({ name, price, qty, discs, total }: Props) {
	return (
		<div className="flex flex-col">
			<p className="text-wrap">{name}</p>
			<div className="flex justify-between">
				<div className="flex gap-1 items-center">
					<p>{price.toLocaleString("id-ID")}</p>
					<span>&#215;</span>
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
