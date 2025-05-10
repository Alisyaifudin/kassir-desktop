import { Link, SetURLSearchParams, useLoaderData, useSearchParams } from "react-router";
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
import { User } from "~/lib/auth";
import { z } from "zod";

export default function Page({ user }: { user: User }) {
	const { timestamp } = useLoaderData<typeof loader>();
	const { state, update } = useRecord(timestamp);
	const [search, setSearch] = useSearchParams();
	const tab = getTab(search);
	return (
		<main className="flex flex-col gap-2 p-2 overflow-y-auto">
			<Await state={state}>
				{(data) => {
					const [errMsg, res] = data;
					if (errMsg !== null) {
						return <TextError>{errMsg}</TextError>;
					}
					const urlBack = getURLBack(res.record, search);
					return (
						<>
							<div className="flex items-center gap-2">
								<Button asChild variant="link" className="self-start">
									<Link to={urlBack}>
										{" "}
										<ChevronLeft /> Kembali
									</Link>
								</Button>
							</div>
							<Tabs value={tab} onValueChange={(val) => setTab(val, setSearch)}>
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
									<Detail
										role={user.role}
										update={update}
										record={res.record}
										items={res.items}
										additionals={res.additionals}
										discs={res.discs}
									/>
								</TabsContent>
							</Tabs>
						</>
					);
				}}
			</Await>
		</main>
	);
}

function getTab(search: URLSearchParams) {
	const parsed = z.enum(["receipt", "detail"]).safeParse(search.get("tab"));
	const tab = parsed.success ? parsed.data : "receipt";
	return tab;
}

function getURLBack(record: DB.Record, search: URLSearchParams) {
	const parsed = z.string().safeParse(search.get("url_back"));
	const defaultURL = `/records?timestamp=${record.timestamp}&selected=${record.timestamp}&mode=${record.mode}`;
	const urlBack = parsed.success ? parsed.data : defaultURL;
	return urlBack;
}

function setTab(tab: string, setSearch: SetURLSearchParams) {
	setSearch({ tab });
}

function useRecord(timestamp: number) {
	const db = useDb();
	const [updated, setUpdated] = useState(false);
	const update = () => setUpdated((prev) => !prev);
	const state = useAsync(getRecord(db, timestamp), [updated]);
	return { state, update };
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
