import { useSize } from "~/hooks/use-size";
import { style } from "~/lib/style";
import { cn } from "~/lib/utils";

const grid = {
	big: {
		gridTemplateColumns: "70px 1fr 150px 230px 70px 150px 50px",
	},
	small: {
		gridTemplateColumns: "40px 1fr 100px 140px 40px 100px 30px",
	}, 
};

export function Header() {
	const size = useSize();
	return (
		<div
			style={{ ...style[size].text, ...grid[size] }}
			className={cn("grid gap-1 outline text-3xl")}
		>
			<p className="border-r">No</p>
			<p className="border-r">Nama</p>
			<p className="border-r">Harga</p>
			<p className="border-r">Diskon</p>
			<p className="border-r">Qty</p>
			<p>Subtotal</p>
			<div />
		</div>
	);
}
