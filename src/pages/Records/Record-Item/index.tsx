import { Link, LoaderFunctionArgs, redirect, RouteObject, useLoaderData } from "react-router";
import { err, numeric, ok, Result } from "../../../utils";
import { useDb } from "../../../Layout";
import { Button } from "../../../components/ui/button";
import { ChevronLeft } from "lucide-react";
import { ItemList } from "./ItemList";
import { Await } from "../../../components/Await";
import { useFetch } from "../../../hooks/useFetch";
import { Database } from "../../../database";
import { useEffect, useState } from "react";

export const route: RouteObject = {
	path: ":timestamp",
	Component: Page,
	loader,
};

function loader({ params }: LoaderFunctionArgs) {
	const parsed = numeric.safeParse(params.timestamp);
	if (!parsed.success) {
		return redirect("/records");
	}
	return { timestamp: parsed.data };
}

const title = {
	buy: "Beli",
	sell: "Jual",
	"": "",
} as Record<string, string>;

export default function Page() {
	const { timestamp } = useLoaderData<typeof loader>();
	const [mode, setMode] = useState<string>("");
	const state = useRecord(timestamp);
	return (
		<main className="flex flex-col gap-2 p-2 overflow-y-auto">
			<div className="flex items-center gap-2">
				<Button asChild variant="link" className="self-start">
					<Link
						to={{
							pathname: "/records",
							search: `?time=${timestamp}&selected=${timestamp}`,
						}}
					>
						{" "}
						<ChevronLeft /> Kembali
					</Link>
				</Button>
				<h2 className="font-bold border px-2 rounded-md">{title[mode]}</h2>
			</div>
			<Await state={state}>
				{(data) => {
					const [errMsg, res] = data;
					if (errMsg !== null) {
						return <p className="text-red-500">{errMsg}</p>;
					}
					useEffect(() => {
						setMode(res.record.mode);
					}, []);
					return <ItemList record={res.record} items={res.items} />;
				}}
			</Await>
		</main>
	);
}

function useRecord(timestamp: number) {
	const db = useDb();
	const res = useFetch(getRecord(db, timestamp), []);
	return res;
}

async function getRecord(
	db: Database,
	timestamp: number
): Promise<Result<string, { record: DB.Record; items: DB.RecordItem[] }>> {
	const all = await Promise.all([
		db.record.getByTime(timestamp),
		db.recordItem.getAllByTime(timestamp),
	]);
	const [errRecord, record] = all[0];
	if (errRecord) {
		return err(errRecord);
	}
	if (record === null) {
		return err("Catatan tidak ada");
	}
	const [errItems, items] = all[1];
	if (errItems !== null) {
		return err(errItems);
	}
	return ok({
		record,
		items,
	});
}
