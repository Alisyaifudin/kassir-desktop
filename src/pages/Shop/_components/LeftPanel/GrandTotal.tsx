export function GrandTotal({ grandTotal, fix }: { grandTotal: number; fix: number }) {
	return (
		<div className="flex flex-col gap-2 pb-6">
			<p className="text-9xl text-center">
				Rp{Number(grandTotal.toFixed(fix)).toLocaleString("id-ID")}
			</p>
		</div>
	);
}
