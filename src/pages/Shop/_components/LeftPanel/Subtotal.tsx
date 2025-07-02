export function Subtotal({ fix, totalAfterDiscount }: { fix: number; totalAfterDiscount: number }) {
	return (
		<div className="self-end w-[410px] justify-between flex gap-2">
			<p>Subtotal:</p>
			<p className="font-bold">
				Rp{Number(totalAfterDiscount.toFixed(fix)).toLocaleString("id-ID")}
			</p>
			<div className="w-[50px]" />
		</div>
	);
}
