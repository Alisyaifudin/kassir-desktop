import {
	Link,
	LoaderFunctionArgs,
	redirect,
	RouteObject,
	useLoaderData,
} from "react-router";
import { err, numeric, ok, Result, tryResult } from "../../../utils";
import {  useEffect, useState } from "react";
import { useDb } from "../../../Layout";
import Database from "@tauri-apps/plugin-sql";
import { Button } from "../../../components/ui/button";
import { ChevronLeft } from "lucide-react";
import { Temporal } from "temporal-polyfill";
import { ItemList } from "./ItemList";
import { Await } from "../../../components/Await";
import { useFetch } from "../../../hooks/useFetch";

export const route: RouteObject = {
	path: ":id",
	Component: Page,
	loader,
};

function loader({ params }: LoaderFunctionArgs) {
	const parsed = numeric.safeParse(params.id);
	if (!parsed.success) {
		return redirect("/records");
	}
	return { id: parsed.data };
}

export default function Page() {
	const { id } = useLoaderData<typeof loader>();
	const [time, setTime] = useState<number>(Temporal.Now.instant().epochMilliseconds);
	const state = useRecord(id);
	return (
		<main className="flex flex-col gap-2 p-2">
			<Button asChild variant="link" className="self-start">
				<Link
					to={{
						pathname: "/records",
						search: "?time=" + time,
					}}
				>
					{" "}
					<ChevronLeft /> Kembali
				</Link>
			</Button>
			<Await state={state}>
					{(data) => {
						const [errMsg, res] = data;
						if (errMsg !== null) {
							return <p className="text-red-500">{errMsg}</p>;
						}
						useEffect(() => {
							setTime(res.record.time);
						}, []);
						return <ItemList record={res.record} items={res.items} />;
					}}
				</Await>
		</main>
	);
}

function useRecord(id: number) {
	const db = useDb();
	const res = useFetch(() => getRecord(db, id));
	return res;
}

async function getRecord(
	db: Database,
	id: number
): Promise<Result<string, { record: DB.Record; items: DB.RecordItem[] }>> {
	const [errMsg, res] = await tryResult({
		run: async () => {
			const all = await Promise.all([
				db.select<DB.Record[]>("SELECT * FROM records WHERE id = $1", [id]),
				db.select<DB.RecordItem[]>("SELECT * FROM record_items WHERE record_id = $1", [id]),
			]);
			const records = all[0];
			if (records.length === 0) {
				return null;
			}
			return {
				record: records[0],
				items: all[1],
			};
		},
	});
	if (errMsg) return err(errMsg);
	if (res === null) return err("Riwayat tidak ditemukan");
	return ok(res);
}
