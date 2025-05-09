import { Temporal } from "temporal-polyfill";
import { Database } from "../../../database";
import { err, ok, Result } from "../../../lib/utils";
import Decimal from "decimal.js";
import { Item, Additional } from "../schema";

export async function submitPayment(
	db: Database,
	mode: "buy" | "sell",
	fix: number,
	record: {
		cashier: string | null;
		credit: 0 | 1;
		totalBeforeDisc: number;
		totalAfterDisc: number;
		totalAfterTax: number;
		totalTax: number;
		grandTotal: number;
		note: string;
		method: "cash" | "transfer" | "other";
		rounding: number | null;
		pay: number;
		disc: {
			value: number | null;
			type: "number" | "percent" | null;
		};
		change: number;
	},
	items: (Item & { id?: number })[],
	additionals: Additional[]
): Promise<
	Result<
		| "Tidak ada barang ._."
		| "Ada barang dengan barcode yang sama"
		| "Aplikasi bermasalah"
		| "Biaya tambahan harus punya nama"
		| "Produk harus punya nama"
		| "Kuantitas harus lebih dari nol"
		| "Harga tidak boleh negatif"
		| "Biaya tambahan tidak boleh negatif"
		| "Gagal menyimpan. Coba lagi."
		| `Ada barang dengan barcode yang sama: ${string}`,
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
	const emptyAdd = additionals.find((add) => add.name.trim() === "");
	if (emptyAdd !== undefined) {
		return err("Biaya tambahan harus punya nama");
	}
	const emptyItem = items.find((item) => item.name.trim() === "");
	if (emptyItem !== undefined) {
		return err("Produk harus punya nama");
	}
	for (const item of items) {
		if (item.qty <= 0) {
			return err("Kuantitas harus lebih dari nol");
		}
		if (item.price < 0) {
			return err("Harga tidak boleh negatif");
		}
	}
	for (const add of additionals) {
		if (add.value < 0) {
			return err("Biaya tambahan tidak boleh negatif");
		}
	}
	const itemsTranform = items.map((item) => {
		const totalBeforeDisc = new Decimal(item.price).times(item.qty);
		const { total: subtotal } = calcSubtotal(item.discs, item.price, item.qty, fix);
		const capital =
			mode === "buy"
				? calcCapital(record.grandTotal, record.totalBeforeDisc, subtotal.toNumber(), item.qty, fix)
				: item.capital;
		return {
			item: {
				timestamp,
				name: item.name.trim(),
				price: Number(item.price),
				qty: Number(item.qty),
				total_before_disc: totalBeforeDisc.toNumber(),
				total: subtotal.toNumber(),
				product_id: item.id ?? null,
				capital: capital ?? 0,
				barcode: item.barcode ?? null,
				stock: mode === "buy" ? Number(item.qty) : item.stock ?? Number(item.qty),
			},
			discs: item.discs,
		};
	});
	const errRecord = await db.record.add(mode, timestamp, record);
	if (errRecord) {
		return err(errRecord);
	}
	const errAdds = await db.additional.addMany(additionals, timestamp);
	if (errAdds) {
		return err(errAdds);
	}
	const productPromises = [];
	if (mode === "buy") {
		for (const { item } of itemsTranform) {
			productPromises.push(
				db.product.upsert({
					name: item.name,
					barcode: item.barcode ?? null,
					capital: item.capital, // shoud be exist
					price: item.price,
					stock: item.qty,
					id: item.product_id,
				})
			);
		}
	} else {
		for (const { item } of itemsTranform) {
			productPromises.push(
				db.product.insertIfNotYet({
					name: item.name,
					barcode: item.barcode,
					price: item.price,
					stock: item.stock - item.qty,
				})
			);
		}
	}
	const resProduct = await Promise.all(productPromises);
	for (const [errMsg] of resProduct) {
		if (errMsg !== null) {
			return err(errMsg);
		}
	}
	const itemPromises: Promise<
		Result<"Aplikasi bermasalah" | "Gagal menyimpan. Coba lagi." | null, number>
	>[] = [];
	itemsTranform.forEach(({ item }, i) => {
		if (item.product_id === null) {
			const productId = resProduct[i][1];
			itemPromises.push(db.recordItem.add({ ...item, product_id: productId }, timestamp, mode));
		} else {
			itemPromises.push(db.recordItem.add(item, timestamp, mode));
		}
	});
	const resItem = await Promise.all(itemPromises);
	for (const [errMsg] of resItem) {
		if (errMsg !== null) {
			return err("Aplikasi bermasalah");
		}
	}

	const itemIds = resItem.map((r) => r[1]!);
	const discPromises = [];
	for (let i = 0; i < itemIds.length; i++) {
		const id = itemIds[i];
		const discs = itemsTranform[i].discs;
		if (discs.length === 0) {
			continue;
		}
		discPromises.push(db.discount.addMany(id, discs));
	}
	const resDisc = await Promise.all(discPromises);
	for (const errMsg of resDisc) {
		if (errMsg !== null) {
			return err("Aplikasi bermasalah");
		}
	}
	return ok(timestamp);
}

export function calcSubtotal(
	discs: {
		value: number;
		type: "number" | "percent";
	}[],
	price: number,
	qty: number,
	fix: number
) {
	const total = new Decimal(price).times(qty);
	let subtotal = total;
	for (const d of discs) {
		switch (d.type) {
			case "number":
				subtotal = subtotal.sub(d.value);
				break;
			case "percent":
				const val = subtotal.times(d.value).div(100).toFixed(fix);
				subtotal = subtotal.sub(val);
		}
	}
	return {
		discount: total.sub(subtotal),
		total: subtotal,
	};
}

export function calcAdditional(totalBeforeTax: Decimal, add: Additional, fix: number) {
	switch (add.kind) {
		case "number":
			return new Decimal(add.value);
		case "percent":
			const val = totalBeforeTax.times(add.value).div(100).toFixed(fix);
			return new Decimal(val);
	}
}

export const calcTotalBeforeDisc = (items: Item[], fix: number) => {
	let total = new Decimal(0);
	for (const item of items) {
		const { total: subtotal } = calcSubtotal(item.discs, item.price, item.qty, fix);
		total = total.add(subtotal);
	}
	return total;
};

export const calcTotalAfterDisc = (
	totalBeforeDisc: Decimal,
	disc: {
		type: "number" | "percent";
		value: number;
	},
	fix: number
) => {
	switch (disc.type) {
		case "number":
			return totalBeforeDisc.sub(disc.value);
		case "percent":
			const val = totalBeforeDisc.times(disc.value).div(100).toFixed(fix);
			return totalBeforeDisc.sub(val);
	}
};

export const calcTax = (totalAfterDisc: Decimal, add: Additional, fix: number) => {
	switch (add.kind) {
		case "number":
			return add.value;
		case "percent":
			const val = totalAfterDisc.times(add.value).div(100).toFixed(fix);
			return Number(val);
	}
};

export const calcTotalTax = (totalAfterDisc: Decimal, adds: Additional[], fix: number) => {
	let total = new Decimal(0);
	for (const add of adds) {
		const val = calcTax(totalAfterDisc, add, fix);
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
	qty: number,
	fix: number
): number {
	const capital = new Decimal(grandTotal)
		.times(subtotal)
		.div(totalBeforeDisc)
		.div(qty)
		.toFixed(fix);
	return Number(capital);
}
