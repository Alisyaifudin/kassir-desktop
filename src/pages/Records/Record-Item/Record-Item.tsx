import { Link, SetURLSearchParams, useLoaderData, useSearchParams } from "react-router";
import { err, ok, Result } from "~/lib/utils";
import { useDB } from "~/RootLayout";
import { Button } from "~/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { Receipt } from "./Receipt";
import { Await } from "~/components/Await";
import { Database } from "~/database";
import { type loader } from ".";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Detail } from "./Detail";
import { useEffect, useState } from "react";
import { z } from "zod";
import { useUser } from "~/Layout";
import { useAsyncDep } from "~/hooks/useAsyncDep";
import { emitter } from "~/lib/event-emitter";

export default function Page() {
	const user = useUser();
	const { timestamp } = useLoaderData<typeof loader>();
	const state = useRecord(timestamp);
	const [search, setSearch] = useSearchParams();
	const tab = getTab(search);
	return (
		<main className="flex flex-col gap-2 p-2 overflow-y-auto">
			<Await state={state}>
				{(data) => {
					const urlBack = getURLBack(data.record, search);
					return (
						<>
							<div className="flex items-center gap-2">
								<Button asChild variant="link" className="self-start">
									<Link to={urlBack}>
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
									<Receipt
										record={data.record}
										items={data.items}
										additionals={data.additionals}
										discs={data.discs}
										methods={data.methods}
									/>
								</TabsContent>
								<TabsContent value="detail">
									<Detail
										role={user.role}
										record={data.record}
										items={data.items}
										additionals={data.additionals}
										discs={data.discs}
										methods={data.methods}
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
	setSearch((prev) => {
		const search = new URLSearchParams(prev);
		search.set("tab", tab);
		return search;
	});
}

function useRecord(timestamp: number) {
	const db = useDB();
	const [updated, setUpdated] = useState(false);
	useEffect(() => {
		const update = () => {
			setUpdated((prev) => !prev);
		};
		emitter.on("fetch-record-item", update);
		return () => {
			emitter.off("fetch-record-item", update);
		};
	}, [timestamp]);
	const promise = () => getRecord(db, timestamp);
	const state = useAsyncDep(promise, [timestamp, updated]);
	return state;
}

async function getRecord(
	db: Database,
	timestamp: number
): Promise<
	Result<
		"Aplikasi bermasalah" | "Catatan tidak ada",
		{
			record: DB.Record;
			items: DB.RecordItem[];
			additionals: DB.Additional[];
			discs: DB.Discount[];
			methods: DB.MethodType[];
		}
	>
> {
	const all = await Promise.all([
		db.record.getByTime(timestamp),
		db.recordItem.getAllByTime(timestamp),
		db.additional.getByTimestamp(timestamp),
		db.discount.getByTimestamp(timestamp),
		db.method.get(),
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
	const [errMethod, methods] = all[4];
	if (errMethod !== null) {
		return err(errMethod);
	}
	return ok({
		record,
		items,
		additionals,
		discs,
		methods,
	});
}
