import { Temporal } from "temporal-polyfill";
import { Database } from "../../database";
import { err, ok, Result } from "../../utils";
import { Item } from "./Item";
import Decimal from "decimal.js";
import { Tax } from "./reducer";

export async function submitPayment(
	db: Database,
	variant: "buy" | "sell",
	record: {
		total: number;
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
	let totalItem = 0;
	for (const item of items) {
		totalItem += Number(item.qty);
	}
	const itemsTranform = items.map((item) => {
		const subtotal = calcSubtotal(item.disc, item.price, item.qty).toNumber();
		const capital = variant === "buy" ? calcCapital(record.total, item, totalItem) : null;
		return {
			timestamp,
			disc_type: item.disc.type,
			disc_val: Number(item.disc.value),
			name: item.name,
			price: Number(item.price),
			qty: Number(item.qty),
			subtotal,
			product_id: item.id,
			capital,
		};
	});
	const res = await Promise.all([
		db.record.add(variant, timestamp, record),
		db.recordItem.add(itemsTranform, timestamp, variant),
		db.tax.add(taxes, timestamp),
	]);
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
	const val = total.times(discVal).div(100);
	return total.sub(val);
}

export function calcTotal(total: Decimal, taxes: Tax[]) {
	const totalTax = taxes.reduce((acc, curr) => calcTax(total, curr.value).add(acc), new Decimal(0));
	return total.add(totalTax);
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
	const val = total.times(discVal).div(100);
	return total.sub(val);
};

export function calcChange(total: Decimal, pay: string): Decimal {
	return new Decimal(pay === "" ? 0 : pay).sub(total);
}

export function calcCapital(grandTotal: number, item: Item, totalItem: number): number {
	const capital = (grandTotal * Number(item.qty)) / totalItem;
	return capital;
}
