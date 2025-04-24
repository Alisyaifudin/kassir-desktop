import Decimal from "decimal.js";

type Props = {
	i: number;
} & DB.RecordItem;

export function Item({ disc_type, disc_val, name, price, qty, subtotal }: Props) {
	const disc = calcDisc(disc_type, disc_val, subtotal);
	return (
		<div className="flex flex-col">
			<p className="text-wrap">{name}</p>
			<div className="flex justify-between">
				<div className="flex gap-1">
					<p>{price.toLocaleString("id-ID")}</p>
					&#215;
					<p>{qty}</p>
				</div>
				<p>{subtotal.toLocaleString("id-ID")}</p>
			</div>
			{disc_val > 0 ? (
				<div className="flex justify-between">
					<Discount type={disc_type} value={disc_val} />
					<p>({(subtotal - disc).toLocaleString("id-ID")})</p>
				</div>
			) : null}
		</div>
	);
}

function Discount({ type, value }: { type: "number" | "percent"; value: number }) {
	switch (type) {
		case "number":
			return <p>(Disc. {value.toLocaleString("id-ID")})</p>;
		case "percent":
			return <p>(Disc. {value}%)</p>;
	}
}

function calcDisc(type: "number" | "percent", value: number, subtotal: number) {
	switch (type) {
		case "number":
			return value;
		case "percent":
			return new Decimal(subtotal).times(value).div(100).toNumber();
	}
}
