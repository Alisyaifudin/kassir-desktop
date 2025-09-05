import Database from "@tauri-apps/plugin-sql";
import { Result, tryResult } from "../lib/utils";

export function genCustomer(db: Database) {
	return {
		get: get(db),
		add: add(db),
		update: update(db),
		del: del(db),
	};
}

function get(db: Database) {
	return {
		async all(): Promise<Result<"Aplikasi bermasalah", DB.Customer[]>> {
			return tryResult({
				run: () => db.select<DB.Customer[]>("SELECT * FROM customers"),
			});
		},
	};
}

function add(db: Database) {
	return {
		async one(phone: string, name: string): Promise<"Aplikasi bermasalah" | null> {
			const [errMsg] = await tryResult({
				run: async () => {
					db.execute("INSERT INTO customers (phone, name) VALUES ($1, $2)", [phone, name]);
				},
			});
			if (errMsg) return errMsg;
			return null;
		},
	};
}

function update(db: Database) {
	return {
		async name(phone: string, name: string): Promise<"Aplikasi bermasalah" | null> {
			const [errMsg] = await tryResult({
				run: () => db.execute("UPDATE customers SET name = $1 WHERE phone = $2", [name, phone]),
			});
			if (errMsg) return errMsg;
			return null;
		},
	};
}

function del(db: Database) {
	return {
		async byPhone(phone: string): Promise<"Aplikasi bermasalah" | "Tidak ada yang dihapus" | null> {
			const [errMsg, res] = await tryResult({
				run: () => db.execute("DELETE FROM customers WHERE phone = $1", [phone]),
			});
			if (errMsg) return errMsg;
			if (res.rowsAffected === 0) return "Tidak ada yang dihapus";
			return null;
		},
	};
}
