import { Outlet, useOutletContext } from "react-router";
import DatabaseTauri from "@tauri-apps/plugin-sql";
import { Store as StoreTauri } from "@tauri-apps/plugin-store";
import { type Database, generateDB } from "./database";
import { generateStore, Store } from "./store";
import { useAsync } from "./hooks/useAsync";
import { AwaitDangerous } from "./components/Await";
import { Loading } from "./components/Loading";

function RootLayout() {
	const state = useInit();
	return (
		<AwaitDangerous state={state} Loading={<Loading />}>
			{(data) => {
				const store = generateStore(data[0]);
				const db = generateDB(data[1]);
				return <Outlet context={{ db, store }} />;
			}}
		</AwaitDangerous>
	);
}

function useInit() {
	const state = useAsync(() =>
		Promise.all([
			StoreTauri.load("store.json", { autoSave: false }),
			DatabaseTauri.load("sqlite:data.db"),
		])
	);
	return state;
}

export const useDB = () => {
	const { db } = useOutletContext<{ db: Database }>();
	return db;
};

export const useStore = () => {
	const { store } = useOutletContext<{ store: Store }>();
	return store;
};

export default RootLayout;
