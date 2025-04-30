import { SetURLSearchParams, useSearchParams } from "react-router";
import { useDb } from "../../Layout";
import { RecordList } from "./RecordList";
import { Temporal } from "temporal-polyfill";
import { formatDate } from "../../lib/utils";
import { useAsync } from "../../hooks/useAsync";
import { Await } from "../../components/Await";
import { ItemList } from "./ItemList";
import { Tabs, TabsList, TabsContent, TabsTrigger } from "../../components/ui/tabs";
import { getMode } from "../Home/Home";
import { TextError } from "../../components/TextError";
import { Button } from "../../components/ui/button";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Input } from "../../components/ui/input";
import { useState } from "react";

export default function Page() {
	const [search, setSearch] = useSearchParams();
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);
	const [val, setVal] = useState("");
	const mode = getMode(search);
	const time = getTime(search);
	const selected = getSelected(search);
	const tz = Temporal.Now.timeZoneId();
	const date = Temporal.Instant.fromEpochMilliseconds(time).toZonedDateTimeISO(tz);
	const tomorrow = date.add(Temporal.Duration.from({ days: 1 }));
	const yesterday = date.subtract(Temporal.Duration.from({ days: 1 }));
	const state = useRecords(date);
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
		<main className="flex flex-col gap-2 p-2 flex-1 overflow-y-auto text-3xl">
			<div className="flex gap-2 items-center w-full">
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
					<p>Tanggal {formatDate(time, "long")}</p>
				</div>
				<form onSubmit={handleSubmitNo} className="flex gap-2 items-center flex-1 justify-end">
					{error === "" ? null : <TextError>{error}</TextError>}
					{loading ? <Loader2 className="animate-spin" /> : null}
					<p>No:</p>
					<Input
						type="search"
						placeholder="Cari catatan"
						className="w-[250px]"
						value={val}
						onChange={handleChangeNo}
					/>
				</form>
			</div>
			<Await state={state}>
				{(data) => {
					const [[errRecords, records], [errItems, items], [errTaxes, taxes]] = data;
					if (errRecords !== null) {
						return <TextError>{errRecords}</TextError>;
					}
					if (errItems !== null) {
						return <TextError>{errItems}</TextError>;
					}
					if (errTaxes !== null) {
						return <TextError>{errTaxes}</TextError>;
					}
					return (
						<div className="grid grid-cols-[530px_1px_1fr] gap-2 h-full overflow-y-auto">
							<Tabs
								value={mode}
								onValueChange={(v) => {
									if (v !== "sell" && v !== "buy") {
										return;
									}
									setMode(setSearch, v);
								}}
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
								records={records}
								mode={mode}
								allTaxes={taxes}
							/>
						</div>
					);
				}}
			</Await>
		</main>
	);
}

function useRecords(date: Temporal.ZonedDateTime) {
	const db = useDb();
	const start = date.startOfDay().epochMilliseconds;
	const end = date.startOfDay().add(Temporal.Duration.from({ days: 1 })).epochMilliseconds;
	const promises = Promise.all([
		db.record.getByRange(start, end),
		db.recordItem.getByRange(start, end),
		db.tax.getByRange(start, end),
	]);
	const state = useAsync(promises, [date]);
	return state;
}

function getTime(search: URLSearchParams): number {
	const timeStr = search.get("time");
	if (timeStr === null || Number.isNaN(timeStr)) {
		return Temporal.Now.instant().epochMilliseconds;
	}
	return Number(timeStr);
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
