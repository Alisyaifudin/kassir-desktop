import { Temporal } from "temporal-polyfill";
import { Database } from "../../database";
import { err, ok, Result } from "../../utils";
import { Item } from "./Item";
import Decimal from "decimal.js";
import { Tax } from "./reducer";

export async function submitPayment(
	db: Database,
	mode: "buy" | "sell",
	record: {
		credit: 0 | 1;
		rounding: number;
		total: number;
		grand_total: number;
		pay: number;
		disc: {
			value: number;
			type: "number" | "percent";
		};
		change: number;
	},
	items: Item[],
	taxes: Tax[]
): Promise<Result<string, number>> {
	const timestamp = Temporal.Now.instant().epochMilliseconds;

	const itemsTranform = items.map((item) => {
		const subtotal = calcSubtotal(item.disc, item.price, item.qty).toNumber();
		const capital =
			mode === "buy" ? calcCapital(record.grand_total, record.total, subtotal, item.qty) : null;
		return {
			timestamp,
			disc_type: item.disc.type,
			disc_val: Number(item.disc.value),
			name: item.name.trim(),
			price: Number(item.price),
			qty: Number(item.qty),
			subtotal,
			product_id: item.id,
			capital,
			barcode: item.barcode ?? null,
		};
	});
	const promises = [
		db.record.add(mode, timestamp, record),
		db.recordItem.add(itemsTranform, timestamp, mode),
		db.tax.add(taxes, timestamp),
	];
	if (mode === "buy") {
		for (const product of itemsTranform) {
			promises.push(
				db.product.upsert({
					name: product.name,
					barcode: product.barcode,
					capital: product.capital ?? 0, // shoud be exist
					price: product.price,
					stock: product.qty,
				})
			);
		}
	}
	const res = await Promise.all(promises);
	const errs = [];
	for (const errMsg of res) {
		if (errMsg !== null) errs.push(errMsg);
	}
	if (errs.length > 0) {
		return err(errs.join("; "));
	}
	return ok(timestamp);
}

export function calcSubtotal(
	disc: {
		value: string;
		type: "number" | "percent";
	},
	price: string,
	qty: string
): Decimal {
	const priceVal = price === "" ? 0 : price;
	const qtyVal = qty === "" ? 0 : qty;
	const total = new Decimal(priceVal).times(qtyVal);
	const discVal = disc.value === "" ? 0 : disc.value;
	if (disc.type === "number") {
		return total.sub(discVal);
	}
	const val = total.times(discVal).div(100).round();
	return total.sub(val);
}

export function calcTotal(total: Decimal, taxes: Tax[], rounding: string) {
	const totalTax = taxes.reduce((acc, curr) => calcTax(total, curr.value).add(acc), new Decimal(0));
	return total.add(totalTax).add(rounding || 0);
}

export function calcTax(total: Decimal, value: number) {
	const val = total.times(value).div(100).round();
	return val;
}

export const calcTotalBeforeTax = (
	items: Item[],
	disc: { type: "number" | "percent"; value: string }
): Decimal => {
	let total = new Decimal(0);
	for (const item of items) {
		const subtotal = calcSubtotal(item.disc, item.price, item.qty);
		total = total.add(subtotal);
	}
	const discVal = disc.value === "" ? 0 : disc.value;
	if (disc.type === "number") {
		return total.sub(discVal);
	}
	const val = total.times(discVal).div(100).round();
	return total.sub(val);
};

export function calcChange(total: Decimal, pay: string): Decimal {
	return new Decimal(pay === "" ? 0 : pay).sub(total);
}

export function calcCapital(
	grandTotal: number,
	total: number,
	subtotal: number,
	qty: string
): number {
	const capital = new Decimal(grandTotal).times(subtotal).div(total).div(qty).round();
	return capital.toNumber();
}
