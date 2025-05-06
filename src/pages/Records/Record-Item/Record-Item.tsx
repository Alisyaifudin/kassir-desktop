import { useLoaderData, useNavigate } from "react-router";
import { err, ok, Result } from "../../../lib/utils";
import { useDb } from "../../../RootLayout";
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
					return (
						<ItemList
							record={res.record}
							items={res.items}
							additionals={res.additionals}
							discs={res.discs}
						/>
					);
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
): Promise<
	Result<
		string,
		{
			record: DB.Record;
			items: DB.RecordItem[];
			additionals: DB.Additional[];
			discs: DB.Discount[];
		}
	>
> {
	const all = await Promise.all([
		db.record.getByTime(timestamp),
		db.recordItem.getAllByTime(timestamp),
		db.additional.getAllByTime(timestamp),
		db.discount.getByTimestamp(timestamp),
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
	const [errAdditionals, additionals] = all[2];
	if (errAdditionals !== null) {
		return err(errAdditionals);
	}
	const [errDiscounts, discs] = all[3];
	if (errDiscounts !== null) {
		return err(errDiscounts);
	}
	return ok({
		record,
		items,
		additionals,
		discs,
	});
}
