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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../components/ui/tabs";
import { Detail } from "./Detail";
import { useState } from "react";

export default function Page() {
	const { timestamp } = useLoaderData<typeof loader>();
	const navigate = useNavigate();
	const {state, update} = useRecord(timestamp);
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
						<Tabs defaultValue="receipt">
							<TabsList>
								<TabsTrigger value="receipt">Struk</TabsTrigger>
								<TabsTrigger value="detail">Detail</TabsTrigger>
							</TabsList>
							<TabsContent value="receipt">
								<ItemList
									record={res.record}
									items={res.items}
									additionals={res.additionals}
									discs={res.discs}
								/>
							</TabsContent>
							<TabsContent value="detail">
								<Detail update={update} record={res.record} items={res.items} additionals={res.additionals} discs={res.discs} />
							</TabsContent>
						</Tabs>
					);
				}}
			</Await>
		</main>
	);
}

function useRecord(timestamp: number) {
	const db = useDb();
	const [updated, setUpdated] = useState(false);
	const update = () =>setUpdated(prev=>!prev);
	const state = useAsync(getRecord(db, timestamp), [updated]);
	return {state, update};
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
