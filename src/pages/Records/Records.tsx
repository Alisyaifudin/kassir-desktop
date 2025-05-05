import { SetURLSearchParams, useSearchParams } from "react-router";
import { useDb } from "../../Layout";
import { RecordList } from "./RecordList";
import { Temporal } from "temporal-polyfill";
import { formatDate } from "../../lib/utils";
import { useAsync } from "../../hooks/useAsync";
import { Await } from "../../components/Await";
import { ItemList } from "./ItemList";
import { Tabs, TabsList, TabsContent, TabsTrigger } from "../../components/ui/tabs";
import { TextError } from "../../components/TextError";
import { Button } from "../../components/ui/button";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Input } from "../../components/ui/input";
import { useState } from "react";
import { z } from "zod";
import { Search } from "./Search";

export default function Page() {
	const [search, setSearch] = useSearchParams();
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);
	const [val, setVal] = useState("");
	const mode = getMode(search);
	const time = getTime(search, setSearch);
	const selected = getSelected(search);
	const query = getQuery(search);
	const tz = Temporal.Now.timeZoneId();
	const date = Temporal.Instant.fromEpochMilliseconds(time).toZonedDateTimeISO(tz);
	const tomorrow = date.add(Temporal.Duration.from({ days: 1 }));
	const yesterday = date.subtract(Temporal.Duration.from({ days: 1 }));
	const [signal, setSignal] = useState(false);
	const state = useRecords(time, signal);
	const db = useDb();
	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const date = e.currentTarget.value;
		const [year, month, day] = date.split("-").map(Number);
		const epoch = Temporal.ZonedDateTime.from({
			timeZone: tz,
			year,
			month,
			day,
			hour: 12,
		}).epochMilliseconds;
		setTime(setSearch, epoch);
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
		setLoading(true);
		const [errMsg, r] = await db.record.getByTime(Number(val));
		if (errMsg) {
			setError(errMsg);
			setLoading(false);
			return;
		}
		if (r === null) {
			setError("Catatan tidak ada");
			setLoading(false);
			return;
		}
		setLoading(false);
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
					<input
						type="date"
						className="outline rounded-md"
						value={formatDate(time)}
						onChange={handleChange}
					/>
					<Button variant={"ghost"} onClick={() => setTime(setSearch, tomorrow.epochMilliseconds)}>
						<ChevronRight />
					</Button>
					<p>{formatDate(time, "long")}</p>
				</div>
				<div className="flex gap-2 flex-1 pl-22">
					<Search query={query} setSearch={setSearch} />
					<form onSubmit={handleSubmitNo} className="flex gap-2 items-center">
						{error === "" ? null : <TextError>{error}</TextError>}
						{loading ? <Loader2 className="animate-spin" /> : null}
						<p>No:</p>
						<Input type="search" placeholder="Cari catatan" value={val} onChange={handleChangeNo} />
					</form>
				</div>
			</div>
			<Await state={state}>
				{(data) => {
					const [[errRecords, rawRecords], [errItems, items], [errTaxes, taxes]] = data;
					if (errRecords !== null) {
						return <TextError>{errRecords}</TextError>;
					}
					if (errItems !== null) {
						return <TextError>{errItems}</TextError>;
					}
					if (errTaxes !== null) {
						return <TextError>{errTaxes}</TextError>;
					}
					console.log(query);
					const filtered =
						query.trim() === ""
							? items
							: items.filter((item) => item.name.toLowerCase().includes(query.toLowerCase()));
					const timestamps = filtered.map((f) => f.timestamp);
					const records =
						query.trim() === ""
							? rawRecords
							: rawRecords.filter((r) => timestamps.includes(r.timestamp));
					return (
						<div className="grid grid-cols-[530px_1px_1fr] gap-2 h-full overflow-hidden">
							<Tabs
								value={mode}
								onValueChange={(v) => {
									if (v !== "sell" && v !== "buy") {
										return;
									}
									setMode(setSearch, v);
								}}
								className="overflow-auto flex-1"
							>
								<TabsList>
									<TabsTrigger value="sell">Jual</TabsTrigger>
									<TabsTrigger value="buy">Beli</TabsTrigger>
								</TabsList>
								<TabsContent value="sell">
									<RecordList
										records={records}
										selectRecord={selectRecord}
										selected={selected}
										mode="sell"
									/>
								</TabsContent>
								<TabsContent value="buy">
									<RecordList
										records={records}
										selectRecord={selectRecord}
										selected={selected}
										mode="buy"
									/>
								</TabsContent>
							</Tabs>
							<div className="border-l" />
							<ItemList
								allItems={items}
								timestamp={selected}
								records={rawRecords}
								mode={mode}
								allTaxes={taxes}
								sendSignal={() => setSignal((prev) => !prev)}
							/>
						</div>
					);
				}}
			</Await>
		</main>
	);
}

function useRecords(timestamp: number, signal: boolean) {
	const db = useDb();
	const tz = Temporal.Now.timeZoneId();
	const date = Temporal.Instant.fromEpochMilliseconds(timestamp).toZonedDateTimeISO(tz);
	const start = date.startOfDay().epochMilliseconds;
	const end = date.startOfDay().add(Temporal.Duration.from({ days: 1 })).epochMilliseconds;
	const promises = Promise.all([
		db.record.getByRange(start, end),
		db.recordItem.getByRange(start, end),
		db.additional.getByRange(start, end),
	]);
	const state = useAsync(promises, [timestamp, signal]);
	return state;
}

function getTime(search: URLSearchParams, setSearch: SetURLSearchParams): number {
	const timeStr = search.get("time");
	if (timeStr === null || Number.isNaN(timeStr)) {
		const now = Temporal.Now.instant().epochMilliseconds;
		setSearch((prev) => ({ ...prev, time: now.toString() }));
		return now;
	}
	return Number(timeStr);
}

function getMode(search: URLSearchParams) {
	const parsed = z.enum(["sell", "buy"]).safeParse(search.get("mode"));
	const mode = parsed.success ? parsed.data : "sell";
	return mode;
}

function setTime(setSearch: SetURLSearchParams, time: number) {
	setSearch((search) => {
		const params = new URLSearchParams(search);
		params.set("time", time.toString());
		return params;
	});
}

function getSelected(search: URLSearchParams): number | null {
	const selected = search.get("selected");
	if (selected === null || Number.isNaN(selected)) {
		return null;
	}
	return Number(selected);
}

function setSelected(setSearch: SetURLSearchParams, timestamp: number, selected: number | null) {
	setSearch((prev) => {
		const params = new URLSearchParams(prev);
		if (timestamp === selected) {
			params.delete("selected");
		} else {
			params.set("selected", timestamp.toString());
		}
		return params;
	});
}

function setMode(setSearch: SetURLSearchParams, mode: "sell" | "buy") {
	setSearch((prev) => {
		const params = new URLSearchParams(prev);
		params.set("mode", mode);
		params.delete("selected");
		return params;
	});
}

function getQuery(search: URLSearchParams): string {
	const query = search.get("query");
	if (query === null) {
		return "";
	}
	return query;
}
