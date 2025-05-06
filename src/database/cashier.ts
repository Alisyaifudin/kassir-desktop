import Database from "@tauri-apps/plugin-sql";
import { err, ok, Result, tryResult } from "../lib/utils";
import { auth } from "../lib/auth";

export type CashierWithoutPassword = Pick<DB.Cashier, "name" | "role">;

export function genChasier(db: Database) {
	return {
		get: async () => {
			return tryResult({
				run: () => db.select<CashierWithoutPassword[]>("SELECT name, role FROM cashiers"),
			});
		},
		getHash: async (
			name: string
		): Promise<Result<"Aplikasi bermasalah" | "Kasir tidak ditemukan", string>> => {
			const [errMsg, res] = await tryResult({
				run: () =>
					db.select<{ password: string }[]>("SELECT password FROM cashiers WHERE name = $1", [
						name,
					]),
			});
			if (errMsg) return err(errMsg);
			if (res.length === 0) return err("Kasir tidak ditemukan");
			return ok(res[0].password);
		},
		add: async (
			name: string,
			role: "user" | "admin",
			password?: string
		): Promise<"Aplikasi bermasalah" | null> => {
			const [errMsg] = await tryResult({
				run: async () => {
					if (role === "admin") {
						db.execute("INSERT INTO cashiers (name, role, password) VALUES ($1, 'admin', $2)", [
							name.trim(),
							password ?? "",
						]);
					} else {
						db.execute("INSERT INTO cashiers (name, role) VALUES ($1, 'user')", [name.trim()]);
					}
				},
			});
			if (errMsg) return errMsg;
			return null;
		},
		updateName: async (oldName: string, newName: string): Promise<"Aplikasi bermasalah" | null> => {
			const [errMsg] = await tryResult({
				run: () => db.execute("UPDATE cashiers SET name = $1 WHERE name = $2", [newName, oldName]),
			});
			if (errMsg) return errMsg;
			return null;
		},
		updateRole: async (
			name: string,
			role: "user" | "admin"
		): Promise<"Aplikasi bermasalah" | null> => {
			const [errMsg] = await tryResult({
				run: () => db.execute("UPDATE cashiers SET role = $1 WHERE name = $2", [role, name]),
			});
			if (errMsg) return errMsg;
			return null;
		},
		updatePassword: async (
			name: string,
			password: string
		): Promise<"Aplikasi bermasalah" | null> => {
			const [errHash, hash] = await auth.hash(password);
			if (errHash) return errHash;
			const [errMsg] = await tryResult({
				run: () => db.execute("UPDATE cashiers SET password = $1 WHERE name = $2", [hash, name]),
			});
			if (errMsg) return errMsg;
			return null;
		},
		delete: async (name: string): Promise<"Aplikasi bermasalah" | null> => {
			const [errMsg] = await tryResult({
				run: () => db.execute("DELETE FROM cashiers WHERE name = $1", [name]),
			});
			if (errMsg) return errMsg;
			return null;
		},
	};
}
