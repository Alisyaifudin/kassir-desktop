import { SetURLSearchParams, useSearchParams } from "react-router";
import { useDb } from "../../Layout";
import { RecordList } from "./RecordList";
import { Temporal } from "temporal-polyfill";
import { formatDate } from "../../utils";
import { useFetch } from "../../hooks/useFetch";
import { Await } from "../../components/Await";
import { ItemList } from "./ItemList";
import { Tabs, TabsList, TabsContent, TabsTrigger } from "../../components/ui/tabs";
import { getMode } from "../Home/Home";
import { TextError } from "../../components/TextError";

export default function Page() {
	const [search, setSearch] = useSearchParams();
	const mode = getMode(search);
	const time = getTime(search);
	const selected = getSelected(search);
	const tz = Temporal.Now.timeZoneId();
	const date = Temporal.Instant.fromEpochMilliseconds(time).toZonedDateTimeISO(tz);
	const state = useRecords(date);

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
	return (
		<main className="flex flex-col gap-2 p-2 flex-1 overflow-y-auto text-3xl">
			<div className="flex gap-2 items-center">
				<input
					type="date"
					className="outline rounded-md"
					value={formatDate(time)}
					onChange={handleChange}
				/>
				<p>Tanggal {formatDate(time, "long")}</p>
			</div>
			<Await state={state}>
				{(data) => {
					const [[errRecords, records], [errItems, items]] = data;
					if (errRecords !== null) {
						return <TextError>{errRecords}</TextError>;
					}
					if (errItems !== null) {
						return <TextError>{errItems}</TextError>;
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
							<ItemList allItems={items} timestamp={selected} records={records} mode={mode} />
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
	]);
	const state = useFetch(promises, [date]);
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
