import { Temporal } from "temporal-polyfill";
import { Database } from "../../database";
import { err, ok, Result } from "../../utils";
import { Item } from "./Item";
import Decimal from "decimal.js";

export async function submitPayment(
	db: Database,
	record: {
		total: number;
		pay: number;
		disc: {
			value: number;
			type: "number" | "percent";
		};
		change: number;
	},
	items: Item[]
): Promise<Result<string, number>> {
	const timestamp = Temporal.Now.instant().epochMilliseconds;
	const errInsertRecord = await db.record.add("sell", timestamp, record);
	if (errInsertRecord !== null) {
		return err(errInsertRecord);
	}
	const itemsTranform = items.map((item) => {
		const subtotal = calcSubtotal(item.disc, item.price, item.qty).toNumber();
		return {
			timestamp,
			disc_type: item.disc.type,
			disc_val: Number(item.disc.value),
			name: item.name,
			price: Number(item.price),
			qty: Number(item.qty),
			subtotal,
			product_id: item.id,
			capital: null,
		};
	});
	const errInsertItems = await db.recordItem.add(itemsTranform, timestamp);
	if (errInsertItems) {
		return err(errInsertItems);
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

export const calcTotal = (
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
