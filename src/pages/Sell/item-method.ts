import { produce } from "immer";
import { calcSubtotal, Item } from "./Item";
import { createContext } from "react";
import { err, ok, Result, tryResult } from "../../utils";
import Database from "@tauri-apps/plugin-sql";
import { Temporal } from "temporal-polyfill";

export const ItemContext = createContext<{
	items: Item[];
	setItems: React.Dispatch<React.SetStateAction<Item[]>>;
}>({ items: [], setItems: () => {} });
export const ItemContextProvider = ItemContext.Provider;

export const itemMethod = (
	db: Database,
	setItems: React.Dispatch<React.SetStateAction<Item[]>>
) => ({
	deleteItem: (index: number) => {
		setItems((prev) => prev.filter((_, i) => i !== index));
	},
	editName: (index: number, name: string) => {
		setItems((items) =>
			produce(items, (draft) => {
				draft[index].name = name;
			})
		);
	},
	editPrice: (index: number, price: string) => {
		if (Number.isNaN(price) || Number(price) < 0 || Number(price) > 1e9) {
			return;
		}
		setItems((items) =>
			produce(items, (draft) => {
				draft[index].price = price;
			})
		);
	},
	editQty: (index: number, qty: string) => {
		setItems((items) => {
			if (
				Number.isNaN(qty) ||
				Number(qty) < 0 ||
				Number(qty) >= 10_000 ||
				(items[index].stock !== undefined && Number(qty) > items[index].stock)
			) {
				return items;
			}
			return produce(items, (draft) => {
				draft[index].qty = qty;
			});
		});
	},
	editDiscVal: (index: number, value: string) => {
		setItems((items) => {
			if (
				Number.isNaN(value) ||
				Number(value) < 0 ||
				(items[index].disc.type === "number" && Number(value) >= 1e9) ||
				(items[index].disc.type === "percent" && Number(value) > 100)
			) {
				return items;
			}
			return produce(items, (draft) => {
				draft[index].disc.value = value;
			});
		});
	},
	editDiscType: (index: number, type: string) => {
		setItems((items) => {
			if (type !== "number" && type !== "percent") {
				return items;
			}
			let value = items[index].disc.value;
			if (type === "percent" && Number(value) > 100) {
				value = "100";
			}
			return produce(items, (draft) => {
				draft[index].disc.value = value;
				draft[index].disc.type = type;
			});
		});
	},
	addItemManual: ({
		name,
		price,
		qty,
		disc,
	}: {
		name: string;
		price: string;
		qty: string;
		disc: {
			type: "number" | "percent";
			value: string;
		};
	}) => {
		setItems((items) =>
			produce(items, (draft) => {
				draft.push({
					name,
					price,
					qty,
					disc,
				});
			})
		);
	},
	addItemSelect: ({
		name,
		price,
		stock,
		id,
	}: {
		name: string;
		price: string;
		stock: number;
		id: number;
	}) => {
		if (stock === 0) {
			return;
		}
		setItems((items) =>
			produce(items, (draft) => {
				draft.push({
					name,
					price,
					qty: "1",
					disc: {
						value: "0",
						type: "number",
					},
					stock,
					id,
				});
			})
		);
	},
	addItemBarcode: async (barcode: string): Promise<string | null> => {
		const [errMsg, item] = await addBarcode(db, barcode);
		if (errMsg !== null) return errMsg;
		setItems((items) =>
			produce(items, (draft) => {
				draft.push({
					name: item.name,
					price: item.price,
					stock: item.stock,
					id: item.id,
					qty: "1",
					disc: {
						value: "0",
						type: "number",
					},
				});
			})
		);
		return null;
	},
	submitPayment: async (
		record: Omit<DB.Record, "id"| "time">,
		items: Item[],
	): Promise<Result<string, number>> => {
		const time = Temporal.Now.instant().epochMilliseconds;
		const [errInsertRecord, id] = await addRecord(db, record, time);
		if (errInsertRecord !== null) {
			return err(errInsertRecord);
		}
		const itemsTranform = items.map((item): Omit<DB.RecordItem, "id"> & {item_id?: number} => {
			const subtotal = calcSubtotal(item.disc, item.price, item.qty).toString();
			return {
				disc_type: item.disc.type,
				disc_val: item.disc.value,
				name: item.name,
				price: item.price,
				qty: Number(item.qty),
				record_id: id,
				subtotal,
				time,
				item_id: item.id
			};
		});
		const errInsertItems = await addRecordItems(db, itemsTranform, time, id);
		if (errInsertItems) {
			return err(errInsertItems);
		}
		return ok(id);
	},
});

async function addBarcode(db: Database, barcode: string): Promise<Result<string, DB.Item>> {
	const [errMsg, item] = await tryResult({
		run: async () => {
			const items = await db.select<DB.Item[]>("SELECT * FROM items WHERE barcode = ?1", [barcode]);
			return items.length ? items[0] : null;
		},
	});
	if (errMsg) return err(errMsg);
	if (item === null) return err("Barang tidak ada");
	if (item.stock === 0) return err("Stok habis");
	return ok(item);
}

async function addRecord(
	db: Database,
	record: Omit<DB.Record, "id"|"time">,
	time: number
): Promise<Result<string, number>> {
	const [errMsg, res] = await tryResult({
		run: () =>
			db.execute(
				`INSERT INTO records (time, total, pay, disc_val, disc_type, change) 
			 VALUES ($1, $2, $3, $4, $5, $6)`,
				[time, record.total, record.pay, record.disc_val, record.disc_type, record.change]
			),
	});
	if (errMsg) return err(errMsg);
	if (res.lastInsertId === undefined) return err("Gagal menambahkan catatan");
	return ok(res.lastInsertId);
}
async function addRecordItems(
	db: Database,
	items: (Omit<DB.RecordItem, "id"> & {item_id?: number})[],
	time: number,
	recordId: number
): Promise<string | null> {
	const [errMsg] = await tryResult({
		run: () => {
			const promises = [];
			for (const item of items) {
				promises.push(db.execute(
					`INSERT INTO record_items (record_id, time, name, price, qty, subtotal, disc_val, disc_type) 
				 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
				 [recordId, time, item.name, item.price, item.qty, item.subtotal, item.disc_val, item.disc_type]
				));
				if (item.item_id !== undefined) {
					promises.push(db.execute(`UPDATE items SET stock = stock - $1 WHERE id = $2`, [item.qty, item.item_id]));
				}
			}
			return Promise.all(promises);
		}
	});
	if (errMsg) return errMsg;
	return null;
}
