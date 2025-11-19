import { Outlet } from "react-router";
import DatabaseTauri from "@tauri-apps/plugin-sql";
import { Store as StoreTauri } from "@tauri-apps/plugin-store";
import { generateDB } from "../database";
import { generateStore } from "../lib/store";
import { Suspense, use, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { storeStore } from "~/store/store";
import { dbStore } from "~/store/db";

const STORE_PATH = "store.json";
const DB_PATH = "sqlite:data.db";

function Loading() {
	return (
		<main className="h-screen w-screen flex items-center justify-center">
			<Loader2 className="animate-spin" size={100} />
		</main>
	);
}
function RootLayout() {
	return (
		<Suspense fallback={<Loading />}>
			<Wrapper />
		</Suspense>
	);
}

const dataPromise = Promise.all([
	StoreTauri.load(STORE_PATH, { autoSave: false }),
	DatabaseTauri.load(DB_PATH),
]);

function Wrapper() {
	const data = use(dataPromise);
	const store = generateStore(data[0]);
	const db = generateDB(data[1]);
	const [mount, setMount] = useState(false);
	useEffect(() => {
		storeStore.set(store);
		dbStore.set(db);
		setMount(true);
	}, []);

	if (!mount) return <Loading />;
	return <Outlet></Outlet>;
}

export default RootLayout;
