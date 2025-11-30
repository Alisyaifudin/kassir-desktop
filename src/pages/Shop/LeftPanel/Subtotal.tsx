import { useSize } from "~/hooks/use-size";
import { style } from "~/lib/style";

export function Subtotal({ fix, totalAfterDiscount }: { fix: number; totalAfterDiscount: number }) {
	const size = useSize();
	return (
		<div className="self-end justify-between flex py-1 gap-2">
			<p style={style[size].text}>Subtotal:</p>
			<p style={style[size].text} className="font-bold">
				Rp{Number(totalAfterDiscount.toFixed(fix)).toLocaleString("id-ID")}
			</p>
			<div className="w-[50px]" />
		</div>
	);
}
