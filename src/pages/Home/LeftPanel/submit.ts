import { Temporal } from "temporal-polyfill";
import { Database } from "../../../database";
import { err, ok, Result } from "../../../lib/utils";
import Decimal from "decimal.js";
import { Item, Other } from "../schema";

export async function submitPayment(
	db: Database,
	mode: "buy" | "sell",
	record: {
		cashier: string | null;
		credit: 0 | 1;
		totalBeforeDisc: number;
		totalAfterDisc: number;
		totalAfterTax: number;
		totalTax: number;
		grandTotal: number;
		note: string;
		method: "cash" | "transfer" | "emoney";
		rounding: number | null;
		pay: number;
		disc: {
			value: number | null;
			type: "number" | "percent" | null;
		};
		change: number;
	},
	items: Item[],
	others: Other[]
): Promise<
	Result<
		| "Tidak ada barang ._."
		| (
				| "Ada barang dengan barcode yang sama"
				| "Aplikasi bermasalah"
				| "Biaya tambahan harus punya nama"
				| "Produk harus punya nama"
		  ),
		number
	>
> {
	if (items.length === 0) {
		return err("Tidak ada barang ._.");
	}
	const timestamp = Temporal.Now.instant().epochMilliseconds;
	const barcodes = items.filter((item) => item.barcode !== null).map((i) => i.barcode);
	const uniqueBarcodes = new Set(barcodes);
	if (barcodes.length > uniqueBarcodes.size) {
		return err("Ada barang dengan barcode yang sama");
	}
	const emptyTax = others.find((other) => other.name.trim() === "");
	if (emptyTax !== undefined) {
		return err("Biaya tambahan harus punya nama");
	}
	const emptyItem = items.find((item) => item.name.trim() === "");
	if (emptyItem !== undefined) {
		return err("Produk harus punya nama");
	}
	const itemsTranform = items.map((item) => {
		const totalBeforeDisc = new Decimal(item.price).times(item.qty);
		const subtotal = calcSubtotal(item.disc, item.price, item.qty).toNumber();
		const capital =
			mode === "buy"
				? calcCapital(record.grandTotal, record.totalBeforeDisc, subtotal, item.qty)
				: null;
		return {
			timestamp,
			disc_type: item.disc.type,
			disc_val: Number(item.disc.value),
			name: item.name.trim(),
			price: Number(item.price),
			qty: Number(item.qty),
			total_before_disc: totalBeforeDisc.toNumber(),
			total: subtotal,
			product_id: item.id,
			capital: capital ?? 0,
			barcode: item.barcode ?? null,
			stock: item.stock ?? Number(item.qty),
		};
	});
	const promises = [
		db.record.add(mode, timestamp, record),
		db.recordItem.add(itemsTranform, timestamp, mode),
		db.other.add(others, timestamp),
	];
	if (mode === "buy") {
		for (const product of itemsTranform) {
			promises.push(
				db.product.upsert({
					name: product.name,
					barcode: product.barcode ?? null,
					capital: product.capital, // shoud be exist
					price: product.price,
					stock: product.qty,
				})
			);
		}
	} else {
		for (const product of itemsTranform) {
			promises.push(
				db.product.insertIfNotYet({
					name: product.name,
					barcode: product.barcode,
					price: product.price,
					stock: product.stock - product.qty,
				})
			);
		}
	}
	const res = await Promise.all(promises);
	for (const errMsg of res) {
		if (errMsg !== null) {
			return err("Aplikasi bermasalah");
		}
	}
	return ok(timestamp);
}

export function calcSubtotal(
	disc: {
		value: number;
		type: "number" | "percent";
	},
	price: number,
	qty: number
): Decimal {
	const total = new Decimal(price).times(qty);
	if (disc.type === "number") {
		return total.sub(disc.value);
	}
	const val = total.times(disc.value).div(100).round();
	return total.sub(val);
}

export function calcOther(totalBeforeTax: Decimal, other: Other) {
	switch (other.kind) {
		case "number":
			return new Decimal(other.value);
		case "percent":
			const val = totalBeforeTax.times(other.value).div(100).round();
			return val;
	}
}

export const calcTotalBeforeDisc = (items: Item[]) => {
	let total = new Decimal(0);
	for (const item of items) {
		const subtotal = calcSubtotal(item.disc, item.price, item.qty);
		total = total.add(subtotal);
	}
	return total;
};

export const calcTotalAfterDisc = (
	totalBeforeDisc: Decimal,
	disc: {
		type: "number" | "percent";
		value: number;
	}
) => {
	switch (disc.type) {
		case "number":
			return totalBeforeDisc.sub(disc.value);
		case "percent":
			const discNum = totalBeforeDisc.times(disc.value).div(100).round();

			return totalBeforeDisc.sub(discNum);
	}
};

export const calcTax = (totalAfterDisc: Decimal, other: Other) => {
	switch (other.kind) {
		case "number":
			return other.value;
		case "percent":
			return totalAfterDisc.times(other.value).div(100).round();
	}
};

export const calcTotalTax = (totalAfterDisc: Decimal, others: Other[]) => {
	let total = new Decimal(0);
	for (const other of others) {
		const val = calcTax(totalAfterDisc, other);
		total = total.add(val);
	}
	return total;
};

export function calcChange(total: Decimal, pay: string): Decimal {
	return new Decimal(pay === "" ? 0 : pay).sub(total);
}

export function calcCapital(
	grandTotal: number,
	totalBeforeDisc: number,
	subtotal: number,
	qty: number
): number {
	const capital = new Decimal(grandTotal).times(subtotal).div(totalBeforeDisc).div(qty).round();
	return capital.toNumber();
}
