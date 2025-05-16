import Decimal from "decimal.js";
import { Discount } from "../Discount";

type Props = {
	i: number;
	discs: { kind: "number" | "percent"; value: number }[];
} & DB.RecordItem;

export function ReceiptItem({ name, price, qty, discs, total_before_disc }: Props) {
	const discsVal = calcDiscs(discs, total_before_disc);
	return (
		<div className="flex flex-col">
			<p className="text-wrap">{name}</p>
			<div className="flex justify-between">
				<div className="flex gap-1">
					<p>{price.toLocaleString("id-ID")}</p>
					&#215;
					<p>{qty}</p>
				</div>
				<p>{total_before_disc.toLocaleString("id-ID")}</p>
			</div>
			{discs.length > 0 ? (
				<>
					{discs.map((disc, i) => (
						<div key={i} className="flex justify-between">
							<Discount type={disc.kind} value={disc.value} />
							<p>({discsVal[i].toLocaleString("id-ID")})</p>
						</div>
					))}
				</>
			) : null}
		</div>
	);
}

function calcDiscs(
	discs: { kind: "number" | "percent"; value: number }[],
	total_before_disc: number
): number[] {
	const discsVal = [];
	let currTotal = new Decimal(total_before_disc);
	for (const disc of discs) {
		switch (disc.kind) {
			case "number":
				currTotal = currTotal.sub(disc.value);
				discsVal.push(currTotal.toNumber());
				break;
			case "percent":
				const discVal = currTotal.times(disc.value).div(100).round();
				currTotal = currTotal.sub(discVal);
				discsVal.push(currTotal.toNumber());
		}
	}
	return discsVal;
}
