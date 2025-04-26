import { calcDisc, Discount } from "../Discount";

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
				{disc_val > 0 ? (
					<p>{(subtotal + disc).toLocaleString("id-ID")}</p>
				) : (
					<p>{subtotal.toLocaleString("id-ID")}</p>
				)}
			</div>
			{disc_val > 0 ? (
				<div className="flex justify-between">
					<Discount type={disc_type} value={disc_val} />
					<p>({subtotal.toLocaleString("id-ID")})</p>
				</div>
			) : null}
		</div>
	);
}

