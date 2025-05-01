import Decimal from "decimal.js";

export function TaxItem({ tax, total }: { tax: DB.Other; total: number }) {
	const val = new Decimal(total).times(tax.value).div(100).round();
	return (
		<div className="grid grid-cols-[170px_200px]">
			<p className="text-end">
				{tax.name} {tax.value}%
			</p>{" "}
			<p className="text-end">Rp{val.toNumber().toLocaleString("id-ID")}</p>
		</div>
	);
}
