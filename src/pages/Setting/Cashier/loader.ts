import { data } from "react-router";
import { db } from "~/database";

export async function loader() {
	const cashiers = db.cashier.get.all();
	return data(cashiers)
}

export type Loader = typeof loader;
