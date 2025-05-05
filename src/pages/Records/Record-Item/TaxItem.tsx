import Decimal from "decimal.js";

export function TaxItem({ tax, total }: { tax: DB.Additional; total: number }) {
	const val =
		tax.kind === "percent"
			? new Decimal(total).times(tax.value).div(100).round().toNumber()
			: tax.value;
	return (
		<div className="grid grid-cols-[100px_100px]">
			<p>
				{tax.name} {tax.kind === "percent" ? `${tax.value}%` : null}
			</p>{" "}
			<p className="text-end">Rp{val.toLocaleString("id-ID")}</p>
		</div>
	);
}
