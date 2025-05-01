import { useLoaderData, useNavigate } from "react-router";
import { err, ok, Result } from "../../../lib/utils";
import { useDb } from "../../../Layout";
import { Button } from "../../../components/ui/button";
import { ChevronLeft } from "lucide-react";
import { ItemList } from "./ItemList";
import { Await } from "../../../components/Await";
import { useAsync } from "../../../hooks/useAsync";
import { Database } from "../../../database";
import { TextError } from "../../../components/TextError";
import { type loader } from ".";

export default function Page() {
	const { timestamp } = useLoaderData<typeof loader>();
	const navigate = useNavigate();
	const state = useRecord(timestamp);
	return (
		<main className="flex flex-col gap-2 p-2 overflow-y-auto">
			<div className="flex items-center gap-2">
				<Button asChild variant="link" className="self-start">
					<Button variant="link" onClick={() => navigate(-1)}>
						{" "}
						<ChevronLeft /> Kembali
					</Button>
				</Button>
			</div>
			<Await state={state}>
				{(data) => {
					const [errMsg, res] = data;
					if (errMsg !== null) {
						return <TextError>{errMsg}</TextError>;
					}
					return <ItemList record={res.record} items={res.items} taxes={res.taxes} />;
				}}
			</Await>
		</main>
	);
}

function useRecord(timestamp: number) {
	const db = useDb();
	const res = useAsync(getRecord(db, timestamp), []);
	return res;
}

async function getRecord(
	db: Database,
	timestamp: number
): Promise<Result<string, { record: DB.Record; items: DB.RecordItem[]; taxes: DB.Other[] }>> {
	const all = await Promise.all([
		db.record.getByTime(timestamp),
		db.recordItem.getAllByTime(timestamp),
		db.tax.getAllByTime(timestamp),
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
	const [errTaxes, taxes] = all[2];
	if (errTaxes !== null) {
		return err(errTaxes);
	}
	return ok({
		record,
		items,
		taxes,
	});
}
