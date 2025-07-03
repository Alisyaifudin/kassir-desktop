import Database from "@tauri-apps/plugin-sql";
import { err, ok, Result, tryResult } from "../lib/utils";
import { auth } from "../lib/auth";

export type CashierWithoutPassword = Pick<DB.Cashier, "name" | "role">;

export function genChasier(db: Database) {
	return {
		get: get(db),
		add: add(db),
		update: update(db),
		del: del(db),
	};
}

function get(db: Database) {
	return {
		async all(): Promise<Result<"Aplikasi bermasalah", CashierWithoutPassword[]>> {
			return tryResult({
				run: () => db.select<CashierWithoutPassword[]>("SELECT name, role FROM cashiers"),
			});
		},
		async hash(
			name: string
		): Promise<Result<"Aplikasi bermasalah" | "Kasir tidak ditemukan", string>> {
			const [errMsg, res] = await tryResult({
				run: () =>
					db.select<{ hash: string }[]>("SELECT hash FROM cashiers WHERE name = $1", [name]),
			});
			if (errMsg) return err(errMsg);
			if (res.length === 0) return err("Kasir tidak ditemukan");
			return ok(res[0].hash);
		},
	};
}

function add(db: Database) {
	return {
		async one(name: string, role: DB.Role, hash: string): Promise<"Aplikasi bermasalah" | null> {
			const [errMsg] = await tryResult({
				run: async () => {
					db.execute("INSERT INTO cashiers (name, role, hash) VALUES ($1, $2, $3)", [
						name.toLowerCase().trim(),
						role,
						hash,
					]);
				},
			});
			if (errMsg) return errMsg;
			return null;
		},
	};
}

function update(db: Database) {
	return {
		async name(oldName: string, newName: string): Promise<"Aplikasi bermasalah" | null> {
			const [errMsg] = await tryResult({
				run: () => db.execute("UPDATE cashiers SET name = $1 WHERE name = $2", [newName, oldName]),
			});
			if (errMsg) return errMsg;
			return null;
		},
		async role(name: string, role: "user" | "admin"): Promise<"Aplikasi bermasalah" | null> {
			const [errMsg] = await tryResult({
				run: () => db.execute("UPDATE cashiers SET role = $1 WHERE name = $2", [role, name]),
			});
			if (errMsg) return errMsg;
			return null;
		},
		async password(name: string, password: string): Promise<"Aplikasi bermasalah" | null> {
			const [errHash, hash] = await auth.hash(password);
			if (errHash) return errHash;
			const [errMsg] = await tryResult({
				run: () => db.execute("UPDATE cashiers SET hash = $1 WHERE name = $2", [hash, name]),
			});
			if (errMsg) return errMsg;
			return null;
		},
	};
}

function del(db: Database) {
	return {
		async byName(name: string): Promise<"Aplikasi bermasalah" | null> {
			const [errMsg] = await tryResult({
				run: () => db.execute("DELETE FROM cashiers WHERE name = $1", [name]),
			});
			if (errMsg) return errMsg;
			return null;
		},
	};
}
