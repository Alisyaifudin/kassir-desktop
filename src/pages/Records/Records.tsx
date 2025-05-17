import { SetURLSearchParams, useSearchParams } from "react-router";
import { useDB } from "~/RootLayout";
import { RecordList } from "./RecordList";
import { Temporal } from "temporal-polyfill";
import { formatDate, numeric } from "~/lib/utils";
import { AwaitDangerous } from "~/components/Await";
import { ItemList } from "./ItemList";
import { Tabs, TabsList, TabsContent, TabsTrigger } from "~/components/ui/tabs";
import { TextError } from "~/components/TextError";
import { Button } from "~/components/ui/button";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Input } from "~/components/ui/input";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { Search } from "./Search";
import { useUser } from "~/Layout";
import Decimal from "decimal.js";
import { Calendar } from "~/components/Calendar";
import { useAsyncDep } from "~/hooks/useAsyncDep";
import { useAction } from "~/hooks/useAction";

export default function Page() {
	const [search, setSearch] = useSearchParams();
	const [val, setVal] = useState("");
	const mode = getMode(search);
	const ref = useRef<HTMLDivElement>(null);
	const isProgrammaticScroll = useRef(false);
	const [time, isNow] = getTime(search);
	useEffect(() => {
		if (isNow) {
			setSearch((prev) => {
				const newSearch = new URLSearchParams(prev);
				newSearch.set("time", time.toString());
				return newSearch;
			});
		}
	}, []);
	const selected = getSelected(search);
	const query = getQuery(search);
	const tz = Temporal.Now.timeZoneId();
	const date = Temporal.Instant.fromEpochMilliseconds(time).toZonedDateTimeISO(tz);
	const tomorrow = date.add(Temporal.Duration.from({ days: 1 }));
	const yesterday = date.subtract(Temporal.Duration.from({ days: 1 }));
	// const [signal, setSignal] = useState(false);
	const { state, revalidate } = useRecords(time);
	// Restore scroll position on component mount
	useEffect(() => {
		const params = new URLSearchParams(window.location.search);
		const parsed = numeric.safeParse(params.get("scroll"));
		const scrollTop = parsed.success ? parsed.data : 0;

		if (scrollTop && ref.current) {
			isProgrammaticScroll.current = true;
			ref.current.scrollTop = scrollTop;
			// Reset the flag after scroll completes
			setTimeout(() => {
				isProgrammaticScroll.current = false;
			}, 100);
		}
	}, [state]);
	const db = useDB();
	const user = useUser();
	const { action, loading, error, setError } = useAction("", (val: number) =>
		db.record.getByTime(val)
	);
	// Throttled scroll handler
	const handleScroll = () => {
		if (isProgrammaticScroll.current || !ref.current) return;

		const scrollTop = ref.current.scrollTop;
		const params = new URLSearchParams(window.location.search);
		params.set("scroll", scrollTop.toString());
		const url = `${window.location.pathname}?${params.toString()}`;
		window.history.replaceState({}, "", url);
	};
	const selectRecord = (timestamp: number) => () => {
		setSelected(setSearch, timestamp, selected);
	};
	const handleChangeNo = (e: React.ChangeEvent<HTMLInputElement>) => {
		const v = e.currentTarget.value.trim();
		if (Number.isNaN(Number(v))) {
			return;
		}
		setError("");
		setVal(v);
	};
	const handleSubmitNo = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		const [errMsg, r] = await action(Number(val));
		if (errMsg) {
			setError(errMsg);
			return;
		}
		if (r === null) {
			setError("Catatan tidak ada");
			return;
		}
		setSearch({
			mode: r.mode,
			time: val,
			selected: val,
		});
	};
	return (
		<main className="flex flex-col gap-2 p-2 flex-1 text-3xl overflow-hidden">
			<div className="flex gap-2 items-center w-full justify-between">
				<div className="flex gap-1 items-center">
					<Button variant={"ghost"} onClick={() => setTime(setSearch, yesterday.epochMilliseconds)}>
						<ChevronLeft />
					</Button>
					<Calendar time={time} setTime={(time) => setTime(setSearch, time)}>
						<p>{formatDate(time, "long")}</p>
					</Calendar>
					<Button variant={"ghost"} onClick={() => setTime(setSearch, tomorrow.epochMilliseconds)}>
						<ChevronRight />
					</Button>
				</div>
				<div className="flex gap-2 flex-1 pl-22">
					<Search query={query} setSearch={setSearch} />
					<form onSubmit={handleSubmitNo} className="flex gap-2 items-center">
						{error === "" ? null : <TextError>{error ?? ""}</TextError>}
						{loading ? <Loader2 className="animate-spin" /> : null}
						<p>No:</p>
						<Input type="search" placeholder="Cari catatan" value={val} onChange={handleChangeNo} />
					</form>
				</div>
			</div>
			<AwaitDangerous state={state}>
				{(data) => {
					const [[errRecords, rawRecords], [errItems, items], [errTaxes, taxes], [errMethod, methods]] = data;
					if (errMethod !== null) {
						return <TextError>{errMethod}</TextError>;
					}
					if (errRecords !== null) {
						return <TextError>{errRecords}</TextError>;
					}
					if (errItems !== null) {
						return <TextError>{errItems}</TextError>;
					}
					if (errTaxes !== null) {
						return <TextError>{errTaxes}</TextError>;
					}
					const filtered =
						query.trim() === ""
							? items
							: items.filter((item) => item.name.toLowerCase().includes(query.toLowerCase()));
					const timestamps = filtered.map((f) => f.timestamp);
					let records =
						query.trim() === ""
							? rawRecords
							: rawRecords.filter((r) => timestamps.includes(r.timestamp));
					records = records.filter((record) => record.mode === mode);
					let total = new Decimal(0);
					let capital = new Decimal(0);
					for (const r of records) {
						total = total.add(r.grand_total);
					}
					const sellTime = records.filter((r) => r.mode === "sell").map((r) => r.timestamp);
					for (const item of items) {
						if (!sellTime.includes(item.timestamp)) {
							continue;
						}
						const t = new Decimal(item.capital).times(item.qty);
						capital = capital.add(t);
					}
					return (
						<div className="grid grid-cols-[530px_1px_1fr] gap-2 h-full overflow-hidden">
							<div className="flex flex-col gap-1 overflow-hidden">
								<Tabs
									value={mode}
									onValueChange={(v) => {
										if (v !== "sell" && v !== "buy") {
											return;
										}
										setMode(setSearch, v);
									}}
									className="overflow-auto flex-1"
									ref={ref}
									onScroll={handleScroll}
								>
									<TabsList>
										<TabsTrigger value="sell">Jual</TabsTrigger>
										{user.role === "admin" ? <TabsTrigger value="buy">Beli</TabsTrigger> : null}
									</TabsList>
									<TabsContent value="sell">
										<RecordList records={records} selectRecord={selectRecord} selected={selected} />
									</TabsContent>
									{user.role === "admin" ? (
										<TabsContent value="buy">
											<RecordList
												records={records}
												selectRecord={selectRecord}
												selected={selected}
											/>
										</TabsContent>
									) : null}
								</Tabs>
								{total === null ? null : (
									<div className="grid grid-cols-[90px_1fr]">
										{mode === "sell" ? (
											<>
												<p>Modal</p>
												<p>: Rp{capital.toNumber().toLocaleString("id-ID")}</p>
											</>
										) : null}
										<p>Total</p>
										<p>: Rp{total.toNumber().toLocaleString("id-ID")}</p>
									</div>
								)}
							</div>
							<div className="border-l" />
							<ItemList
								allItems={items}
								timestamp={selected}
								records={rawRecords}
								allTaxes={taxes}
								methods={methods}
								revalidate={revalidate}
							/>
						</div>
					);
				}}
			</AwaitDangerous>
		</main>
	);
}

function useRecords(timestamp: number) {
	const db = useDB();
	const tz = Temporal.Now.timeZoneId();
	const date = Temporal.Instant.fromEpochMilliseconds(timestamp).toZonedDateTimeISO(tz);
	const start = date.startOfDay().epochMilliseconds;
	const end = date.startOfDay().add(Temporal.Duration.from({ days: 1 })).epochMilliseconds;
	const promises = Promise.all([
		db.record.getByRange(start, end),
		db.recordItem.getByRange(start, end),
		db.additional.getByRange(start, end),
		db.method.get()
	]);
	const [updated, setUpdated] = useState(false);
	const revalidate = () => setUpdated((prev) => !prev);
	const state = useAsyncDep(() => promises, [timestamp, updated]);
	return { state, revalidate };
}

function getTime(search: URLSearchParams): [number, boolean] {
	const timeStr = search.get("time");
	if (timeStr === null || Number.isNaN(timeStr)) {
		const now = Temporal.Now.instant().epochMilliseconds;
		return [now, true];
	}
	return [Number(timeStr), false];
}

function getMode(search: URLSearchParams) {
	const parsed = z.enum(["sell", "buy"]).safeParse(search.get("mode"));
	const mode = parsed.success ? parsed.data : "sell";
	return mode;
}

function setTime(setSearch: SetURLSearchParams, time: number) {
	const search = new URLSearchParams(window.location.search);
	search.set("time", time.toString());
	setSearch(search);
}

function getSelected(search: URLSearchParams): number | null {
	const selected = search.get("selected");
	if (selected === null || Number.isNaN(selected)) {
		return null;
	}
	return Number(selected);
}

function setSelected(setSearch: SetURLSearchParams, timestamp: number, selected: number | null) {
	const search = new URLSearchParams(window.location.search);
	if (timestamp === selected) {
		search.delete("selected");
	} else {
		search.set("selected", timestamp.toString());
	}
	setSearch(search);
}

function setMode(setSearch: SetURLSearchParams, mode: "sell" | "buy") {
	const search = new URLSearchParams(window.location.search);
	search.set("mode", mode);
	search.delete("selected");
	setSearch(search);
}

function getQuery(search: URLSearchParams): string {
	const query = search.get("query");
	if (query === null) {
		return "";
	}
	return query;
}
