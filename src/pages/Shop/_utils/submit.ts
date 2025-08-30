import { Temporal } from "temporal-polyfill";
import { Database } from "~/database";
import { err, ok, Result } from "~/lib/utils";
import { Summary } from "./generate-record";

export async function submitPayment(
	db: Database,
	mode: DB.Mode,
	credit: 0 | 1,
	fix: number,
	record: Summary["record"],
	items: Summary["items"],
	additionals: Summary["additionals"],
	customer: {
		name: string;
		phone: string;
		isNew: boolean;
	}
): Promise<
	Result<
		| "Tidak ada barang/biaya tambahan ._."
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
	if (items.length === 0 && additionals.length === 0) {
		return err("Tidak ada barang/biaya tambahan ._.");
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
	const [errBarcode, check] = await db.product.aux.checkBarcodes(
		items
			.filter((i) => i.barcode !== null && i.productId === undefined)
			.map((i) => i.barcode as string)
	);
	if (errBarcode) {
		return err(errBarcode);
	}
	if (check) {
		return err("Ada barang dengan barcode yang sama");
	}
	if (customer.isNew && customer.name.trim() !== "" && customer.phone.trim() !== "") {
		const errCustomer = await db.customer.add.one(customer.phone.trim(), customer.name.trim());
		if (errCustomer) return err(errCustomer);
	}
	const errRecord = await db.record.add.one(timestamp, mode, {
		cashier: record.cashier,
		credit,
		note: record.note,
		methodId: record.method.id,
		rounding: Number(record.rounding.toFixed(fix)),
		pay: Number(record.pay.toFixed(fix)),
		discVal: Number(record.discVal),
		discKind: record.discKind,
		fix,
		customerName: customer.name,
		customerPhone: customer.phone,
	});
	if (errRecord) {
		return err(errRecord);
	}
	const [errAdds, addIds] = await db.additional.add.many(
		timestamp,
		additionals.map((a) => ({
			kind: a.kind,
			name: a.name,
			value: Number(a.value.toFixed(fix)),
		}))
	);
	if (errAdds) {
		await db.record.del.byTimestamp(timestamp);
		return err(errAdds);
	}
	const productPromises = [];
	if (mode === "buy") {
		for (const item of items) {
			productPromises.push(
				db.product.add.orUpdate({
					name: item.name,
					barcode: item.barcode ?? null,
					capital: Number(item.capital.toFixed(fix)),
					price: Number(item.price.toFixed(fix)),
					stock: item.qty,
					id: item.productId ?? null,
				})
			);
		}
	} else {
		for (const item of items) {
			productPromises.push(
				db.product.add.ifNotYet({
					name: item.name,
					barcode: item.barcode,
					price: Number(item.price.toFixed(fix)),
					productId: item.productId ?? null,
					stock: item.stock ?? item.qty,
					qty: item.qty,
				})
			);
		}
	}
	const resProduct = await Promise.all(productPromises);
	for (const [errMsg] of resProduct) {
		if (errMsg !== null) {
			await Promise.all([[db.record.del.byTimestamp(timestamp), db.additional.del.many(addIds)]]);
			return err(errMsg);
		}
	}
	const itemPromises: Promise<
		Result<"Aplikasi bermasalah" | "Gagal menyimpan. Coba lagi." | null, number>
	>[] = [];
	items.forEach((item, i) => {
		if (item.productId === undefined) {
			const productId = resProduct[i][1];
			itemPromises.push(db.recordItem.add.one(timestamp, { ...item, productId }));
		} else {
			itemPromises.push(
				db.recordItem.add.one(timestamp, { ...item, productId: item.productId ?? null })
			);
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
		const discs = items[i].discs;
		if (discs.length === 0) {
			continue;
		}
		discPromises.push(
			db.discount.add.many(
				id,
				discs.map((d) => ({
					kind: d.kind,
					value: d.kind === "number" ? Number(d.value.toFixed(fix)) : d.value,
				}))
			)
		);
	}
	const resDisc = await Promise.all(discPromises);
	for (const errMsg of resDisc) {
		if (errMsg !== null) {
			return err("Aplikasi bermasalah");
		}
	}
	return ok(timestamp);
}
