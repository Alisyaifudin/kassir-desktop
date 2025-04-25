import Decimal from "decimal.js";

export function TaxItem({tax, total}: {tax: DB.Tax, total: number}) {
  const val = new Decimal(total).times(tax.value).div(100).round();
	return (
		<div className="grid grid-cols-[100px_100px]">
			<p>{tax.name} {tax.value}%</p>{" "}
			<p className="text-end">Rp{(val.toNumber()).toLocaleString("id-ID")}</p>
		</div>
	);
}
