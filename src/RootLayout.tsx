import { Outlet, useOutletContext } from "react-router";
import DatabaseTauri from "@tauri-apps/plugin-sql";
import { useEffect, useState } from "react";
import { Store as StoreTauri } from "@tauri-apps/plugin-store";
import { type Database, generateDB } from "./database";
import { generateStore, Store } from "./store";
import { Loader2 } from "lucide-react";

function RootLayout() {
	const [db, setDb] = useState<Database | null>(null);
	const [store, setStore] = useState<Store | null>(null);
	useEffect(() => {
		StoreTauri.load("store.json", { autoSave: false }).then((store) => {
			const s = generateStore(store);
			setStore(s);
		});
		DatabaseTauri.load("sqlite:data.db").then((db) => {
			setDb(generateDB(db));
		});
	}, []);
	if (db === null || store === null) {
		return (
			<main className="flex items-center justify-center flex-1">
				<Loader2 className="animate-spin" size={35} />
			</main>
		);
	}
	return <Outlet context={{ db, store }} />;
}

export const useDb = () => {
	const { db } = useOutletContext<{ db: Database }>();
	return db;
};

export const useStore = () => {
	const { store } = useOutletContext<{ store: Store }>();
	return store;
};

export default RootLayout;
