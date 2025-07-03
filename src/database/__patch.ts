import Database from "@tauri-apps/plugin-sql";
import { auth } from "~/lib/auth";

export async function patch_migration_cashiers(db: Database) {
	const [oldy, newly] = await Promise.all([
		db.select<{ name: string; password: string; role: DB.Role }[]>("SELECT * FROM cashiers_old"),
		db.select<{ name: string; hash: string; role: DB.Role }[]>("SELECT * FROM cashiers"),
	]);

	if (oldy.length === 0) {
		return;
	}
	if (newly.length > 0) {
		return;
	}
	const promises = [];
	for (const cashier of oldy) {
		const [errMsg, hash] = await auth.hash(cashier.password);
		if (errMsg) throw new Error(errMsg);
		promises.push(
			db.execute("INSERT INTO cashiers (name, role, hash) VALUES ($1, $2, $3)", [
				cashier.name,
				cashier.role,
				hash,
			])
		);
	}
}
