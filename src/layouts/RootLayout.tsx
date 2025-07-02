import { Outlet } from "react-router";
import DatabaseTauri from "@tauri-apps/plugin-sql";
import { Store as StoreTauri } from "@tauri-apps/plugin-store";
import { generateDB } from "../database";
import { generateStore } from "../lib/store";
import { Loading } from "../components/Loading";
import { Async } from "~/components/Async";
import { useFetch } from "~/hooks/useFetch";
import { tryResult } from "~/lib/utils";
import { useCallback } from "react";

function RootLayout({ storePath, dbPath }: { storePath: string; dbPath: string }) {
	const state = useInit(storePath, dbPath);
	return (
		<Async state={state} Loading={<Loading />}>
			{(data) => {
				const store = generateStore(data[0]);
				const db = generateDB(data[1]);
				return <Outlet context={{ db, store }} />;
			}}
		</Async>
	);
}

function useInit(storePath: string, dbPath: string) {
	const fetch = useCallback(
		() =>
			tryResult({
				run: () =>
					Promise.all([
						StoreTauri.load(storePath, { autoSave: false }),
						DatabaseTauri.load(dbPath),
					]),
			}),
		[]
	);
	const [state] = useFetch(fetch);
	return state;
}

export default RootLayout;
