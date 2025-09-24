import { cn } from "~/lib/utils";

export function Header() {
	return (
		<div
			className={cn(
				"grid gap-1 outline text-3xl",
				"grid-cols-[70px_1fr_150px_230px_70px_150px_50px]"
			)}
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
