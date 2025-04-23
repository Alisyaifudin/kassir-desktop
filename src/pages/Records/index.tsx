import { LoaderFunctionArgs, RouteObject, useLoaderData, useSearchParams } from "react-router";
import { useDb } from "../../Layout";
import { RecordList } from "./RecordList";
import { route as itemRoute } from "./Record-Item";
import { Temporal } from "temporal-polyfill";
import { monthNames } from "../../utils";
import { useFetch } from "../../hooks/useFetch";
import { Await } from "../../components/Await";
import { Separator } from "../../components/ui/separator";
import { ItemList } from "./ItemList";
import { useState } from "react";

export const route: RouteObject = {
	path: "records",
	children: [{ index: true, Component: Page, loader }, itemRoute],
};

function loader({ request }: LoaderFunctionArgs) {
	const url = new URL(request.url);
	const time = getTime(url.searchParams);
	return { time };
}

function getTime(search: URLSearchParams): number {
	const timeStr = search.get("time");
	if (timeStr === null || Number.isNaN(timeStr)) {
		return Temporal.Now.instant().epochMilliseconds;
	}
	return Number(timeStr);
}

export default function Page() {
	const { time } = useLoaderData<typeof loader>();
	const tz = Temporal.Now.timeZoneId();
	const [selected, setSelected] = useState<number | null>(null);
	const date = Temporal.Instant.fromEpochMilliseconds(time).toZonedDateTimeISO(tz);
	const { day, month, year } = date;
	const state = useRecords(date);
	const [_, setSearch] = useSearchParams();
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
		setSearch({
			time: epoch.toString(),
		});
	};
	const selectRecord = (id: number) => () => {
		setSelected((prev) => (prev === id ? null : id));
	};
	return (
		<main className="flex flex-col gap-2 p-2  flex-1">
			<div className="flex gap-2 items-center ">
				<input
					type="date"
					className="outline rounded-md"
					value={`${year}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`}
					onChange={handleChange}
				/>
				<p>
					Tanggal {day} {monthNames[month]} {year}
				</p>
			</div>
			<Await state={state}>
				{(data) => (
					<div className="grid grid-cols-[1fr_1px_3fr] gap-2 h-full">
						<RecordList records={data[0]} selectRecord={selectRecord} selected={selected} />
						<div className="border-l" />
						<ItemList allItems={data[1]} recordId={selected} />
					</div>
				)}
			</Await>
		</main>
	);
}

function useRecords(date: Temporal.ZonedDateTime) {
	const db = useDb();
	const start = date.startOfDay().epochMilliseconds;
	const end = date.startOfDay().add(Temporal.Duration.from({ days: 1 })).epochMilliseconds;
	const promises = Promise.all([
		db.select<DB.Record[]>(
			"SELECT * FROM records WHERE time BETWEEN $1 AND $2 ORDER BY time DESC",
			[start, end]
		),
		db.select<DB.RecordItem[]>(
			"SELECT * FROM record_items WHERE time BETWEEN $1 AND $2 ORDER BY time DESC",
			[start, end]
		),
	]);
	const state = useFetch(promises);
	return state;
}
